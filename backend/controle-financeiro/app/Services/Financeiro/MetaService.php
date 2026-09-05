<?php

namespace App\Services\Financeiro;

use App\Models\Meta;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Objetivos financeiros e o compromisso mensal que eles criam.
 *
 * A ordem da listagem é deliberada: primeiro o que ainda pede decisão, do prazo
 * mais próximo para o mais distante; metas sem prazo depois; concluídas por
 * último.
 *
 * A regra central é uma divisão só, mas as bordas importam:
 *
 *  - aporte mensal = (objetivo − acumulado) ÷ meses restantes até o prazo;
 *  - meta sem prazo NÃO gera compromisso: sem data não dá para inferir urgência,
 *    e inventar um prazo seria pior do que não ter nenhum;
 *  - meta já atingida não gera compromisso;
 *  - meta com prazo vencido conta como se o valor inteiro fosse necessário
 *    agora — o divisor nunca é zero nem negativo.
 *
 * O acumulado é recalculado a cada consulta, então o aporte necessário cai
 * sozinho conforme o usuário registra o que já guardou. Não há histórico de
 * aportes, e não precisa haver.
 */
class MetaService
{
    /**
     * Metas do usuário com os números derivados.
     *
     * @return array{itens: array<int, array<string, mixed>>, resumo: array<string, mixed>}
     */
    public function listar(int $userId, ?CarbonImmutable $referencia = null): array
    {
        $hoje = $referencia ?? CarbonImmutable::now()->startOfDay();

        $metas = Meta::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            // Concluída vai para o fim mesmo tendo o prazo mais próximo: já não
            // pede decisão nenhuma, e no topo ela empurra para baixo o que
            // ainda pede. Depois dela, prazo mais próximo primeiro; sem prazo
            // por último, porque não tem urgência a comparar.
            ->orderByRaw('valor_atual >= valor_objetivo')
            ->orderByRaw('prazo is null')
            ->orderBy('prazo')
            ->orderBy('id')
            ->get();

        $itens = $metas->map(fn (Meta $meta) => $this->detalhar($meta, $hoje))->values()->all();

        return ['itens' => $itens, 'resumo' => $this->resumo($itens)];
    }

    /**
     * Compromisso mensal somado de todas as metas com prazo em aberto.
     *
     * É o número que entra na estimativa de quanto ainda dá para gastar.
     */
    public function compromissoMensal(int $userId, ?CarbonImmutable $referencia = null): float
    {
        $hoje = $referencia ?? CarbonImmutable::now()->startOfDay();

        return Meta::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->comPrazo()
            ->get()
            ->sum(fn (Meta $meta) => $this->aporteMensal($meta, $hoje));
    }

    /**
     * @return array<string, mixed>
     */
    public function detalhar(Meta $meta, CarbonImmutable $hoje): array
    {
        $objetivo = (float) $meta->valor_objetivo;
        $atual = max(0.0, (float) $meta->valor_atual);
        $restante = max(0.0, round($objetivo - $atual, 2));
        $concluida = $meta->estaConcluida();

        $mesesRestantes = $meta->prazo ? $this->mesesAte($meta->prazo, $hoje) : null;
        $vencida = $meta->prazo !== null
            && ! $concluida
            && CarbonImmutable::parse($meta->prazo)->startOfDay()->lessThan($hoje);

        return [
            'id'              => $meta->id,
            'nome'            => $meta->nome,
            'valor_objetivo'  => round($objetivo, 2),
            'valor_atual'     => round($atual, 2),
            'restante'        => $restante,
            // Denominador zero devolve 0.0: nunca INF, nunca NAN.
            'percentual'      => $objetivo > 0 ? round(min(100, ($atual / $objetivo) * 100), 1) : 0.0,
            'prazo'           => $meta->prazo?->toDateString(),
            'meses_restantes' => $mesesRestantes,
            'aporte_mensal'   => round($this->aporteMensal($meta, $hoje), 2),
            'status'          => match (true) {
                $concluida            => 'concluida',
                $meta->prazo === null => 'sem_prazo',
                $vencida              => 'vencida',
                default               => 'em_andamento',
            },
            'concluida_em'    => $meta->concluida_em?->toIso8601String(),
        ];
    }

    /**
     * Quanto precisa ser guardado por mês para a meta fechar no prazo.
     *
     * Zero para meta sem prazo ou já atingida. Prazo vencido concentra tudo no
     * mês corrente, em vez de dividir por um número negativo.
     */
    private function aporteMensal(Meta $meta, CarbonImmutable $hoje): float
    {
        if ($meta->prazo === null || $meta->estaConcluida()) {
            return 0.0;
        }

        $restante = max(0.0, (float) $meta->valor_objetivo - (float) $meta->valor_atual);
        $meses = max(1, $this->mesesAte($meta->prazo, $hoje));

        return $restante / $meses;
    }

    /** Meses do mês corrente até o do prazo, sempre pelo menos 1. */
    private function mesesAte(mixed $prazo, CarbonImmutable $hoje): int
    {
        $destino = CarbonImmutable::parse($prazo)->startOfMonth();
        $inicio = $hoje->startOfMonth();

        return max(1, (int) $inicio->diffInMonths($destino, false) + 1);
    }

    /**
     * @param  array<int, array<string, mixed>>  $itens
     * @return array<string, mixed>
     */
    private function resumo(array $itens): array
    {
        $emAberto = array_filter($itens, fn ($m) => $m['status'] !== 'concluida');

        return [
            'quantidade'          => count($itens),
            'concluidas'          => count($itens) - count($emAberto),
            'vencidas'            => count(array_filter($itens, fn ($m) => $m['status'] === 'vencida')),
            'sem_prazo'           => count(array_filter($itens, fn ($m) => $m['status'] === 'sem_prazo')),
            'total_objetivo'      => round(array_sum(array_column($itens, 'valor_objetivo')), 2),
            'total_acumulado'     => round(array_sum(array_column($itens, 'valor_atual')), 2),
            'total_restante'      => round(array_sum(array_column($itens, 'restante')), 2),
            'compromisso_mensal'  => round(array_sum(array_column($itens, 'aporte_mensal')), 2),
        ];
    }

    /**
     * Mantém `concluida_em` coerente com o acumulado.
     *
     * Marcar a conclusão no momento em que ela acontece — e desmarcar se o
     * usuário corrigir o valor para baixo — evita que a data fique mentindo.
     */
    public function sincronizarConclusao(Meta $meta): Meta
    {
        $atingida = $meta->estaConcluida();

        if ($atingida && $meta->concluida_em === null) {
            $meta->forceFill(['concluida_em' => now()])->save();
        }

        if (! $atingida && $meta->concluida_em !== null) {
            $meta->forceFill(['concluida_em' => null])->save();
        }

        return $meta;
    }
}
