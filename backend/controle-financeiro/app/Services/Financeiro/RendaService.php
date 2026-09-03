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
