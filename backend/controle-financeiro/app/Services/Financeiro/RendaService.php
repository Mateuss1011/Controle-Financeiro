<?php

namespace App\Services\Financeiro;

use App\Models\Salario;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Fonte única de verdade sobre a renda do usuário.
 *
 * Substitui as três definições divergentes que existiam antes
 * (`latest('id')`, `latest()` por created_at e `.at(-1)` no frontend):
 * a renda de um período é a renda ATIVA daquela competência, e ponto.
 */
class RendaService
{
    /**
     * Cria ou atualiza a renda da competência, sem nunca duplicar.
     *
     * A unicidade por (user_id, competencia) é garantida aqui porque o MariaDB
     * 10.4 não suporta índice único parcial que conviva com soft deletes.
     */
    public function registrar(int $userId, CarbonImmutable $competencia, float $valor, ?string $descricao = null): Salario
    {
        return DB::transaction(function () use ($userId, $competencia, $valor, $descricao) {
            $renda = Salario::withoutGlobalScope('doUsuario')
                ->where('user_id', $userId)
                ->whereDate('competencia', $competencia->startOfMonth())
                ->first();

            if ($renda) {
                $renda->fill([
                    'valor'     => $valor,
                    'descricao' => $descricao,
                ])->save();

                return $renda;
            }

            return Salario::create([
                'user_id'     => $userId,
                'valor'       => $valor,
                'competencia' => $competencia->startOfMonth()->toDateString(),
                'descricao'   => $descricao,
            ]);
        });
    }


    /**
     * Contexto do histórico de rendas.
     *
     * A lista em si continua saindo do model (e do RendaResource); o que sai
     * daqui é o que a lista sozinha não conta: qual competência é a atual, se
     * ela tem renda, a média do último ano e quanto cada mês variou em relação
     * ao anterior.
     *
     * A variação vem como mapa indexado por competência para não alterar o
     * formato de `data`, que já é consumido pelo frontend.
     *
     * @return array<string, mixed>
     */
    public function contextoDoHistorico(int $userId): array
    {
        $rendas = Salario::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->orderBy('competencia')
            ->get(['id', 'valor', 'competencia']);

        $atual = CarbonImmutable::now()->startOfMonth();

        $variacoes = [];
        $anterior = null;

        foreach ($rendas as $renda) {
            $chave = $renda->competencia->format(PeriodoService::FORMATO);
            $valor = (float) $renda->valor;

            $variacoes[$chave] = [
                'anterior'            => $anterior ? round($anterior['valor'], 2) : null,
                'competencia_anterior' => $anterior['competencia'] ?? null,
                'variacao_absoluta'   => $anterior ? round($valor - $anterior['valor'], 2) : null,
                // Base zero não gera percentual: "+100%" sobre nada não informa.
                'variacao_percentual' => $anterior && $anterior['valor'] > 0
                    ? round((($valor - $anterior['valor']) / $anterior['valor']) * 100, 1)
                    : null,
            ];

            $anterior = ['valor' => $valor, 'competencia' => $chave];
        }

        $ultimoAno = $rendas
            ->filter(fn (Salario $r) => $r->competencia->greaterThanOrEqualTo($atual->subMonths(11)))
            ->map(fn (Salario $r) => (float) $r->valor);

        return [
            'competencia_atual' => $atual->format(PeriodoService::FORMATO),
            'renda_atual'       => $this->valorDaCompetencia($userId, $atual) ?: null,
            'tem_renda_atual'   => $this->daCompetencia($userId, $atual) !== null,
            'total_registros'   => $rendas->count(),
            'media_12_meses'    => $ultimoAno->isNotEmpty() ? round($ultimoAno->avg(), 2) : null,
            // Cast para objeto: um array associativo vazio vira `[]` no JSON, e o
            // cliente espera sempre um mapa indexado por competência.
            'variacoes'         => (object) $variacoes,
        ];
    }

    /** Renda da competência informada, ou null se não houver. */
    public function daCompetencia(int $userId, CarbonImmutable $competencia): ?Salario
    {
        return Salario::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->whereDate('competencia', $competencia->startOfMonth())
            ->first();
    }

    /** Valor da renda da competência, 0.0 quando não houver registro. */
    public function valorDaCompetencia(int $userId, CarbonImmutable $competencia): float
    {
        return (float) ($this->daCompetencia($userId, $competencia)?->valor ?? 0.0);
    }

    /**
     * Competência mais recente com renda registrada. Serve para o frontend
     * abrir num período que tenha dados em vez de num mês vazio.
     */
    public function competenciaMaisRecente(int $userId): ?CarbonImmutable
    {
        $data = Salario::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->max('competencia');

        return $data ? CarbonImmutable::parse($data)->startOfMonth() : null;
    }
}
