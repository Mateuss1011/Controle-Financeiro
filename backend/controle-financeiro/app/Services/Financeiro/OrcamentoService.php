<?php

namespace App\Services\Financeiro;

use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Orcamento;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Orçamento por categoria.
 *
 * Duas regras sustentam tudo aqui:
 *
 * 1. RESOLUÇÃO — um orçamento específico da competência sempre vence o
 *    recorrente da mesma categoria. É o que permite definir "Alimentação:
 *    R$ 800" uma vez e abrir exceção só em dezembro.
 *
 * 2. UNICIDADE — uma categoria tem no máximo um orçamento por competência (e no
 *    máximo um recorrente). Como o MariaDB trata NULLs como distintos num
 *    índice único, isso é garantido aqui, no upsert, e não no banco.
 */
class OrcamentoService
{
    /** Acima disto o orçamento entra em atenção; acima de 100%, estourado. */
    private const LIMIAR_ATENCAO = 0.80;

    /**
     * Cria ou atualiza o orçamento de uma categoria numa competência.
     *
     * `$competencia` nula grava o recorrente.
     */
    public function registrar(
        int $userId,
        int $categoriaId,
        float $limite,
        ?CarbonImmutable $competencia = null,
    ): Orcamento {
        return DB::transaction(function () use ($userId, $categoriaId, $limite, $competencia) {
            $query = Orcamento::withoutGlobalScope('doUsuario')
                ->where('user_id', $userId)
                ->where('categoria_id', $categoriaId);

            $existente = $competencia
                ? (clone $query)->whereDate('competencia', $competencia->startOfMonth())->first()
                : (clone $query)->whereNull('competencia')->first();

            if ($existente) {
                $existente->update(['valor_limite' => $limite]);

                return $existente;
            }

            return Orcamento::create([
                'user_id'      => $userId,
                'categoria_id' => $categoriaId,
                'competencia'  => $competencia?->startOfMonth()->toDateString(),
                'valor_limite' => $limite,
            ]);
        });
    }

    /**
     * Orçamentos vigentes numa competência, confrontados com o gasto real.
     *
     * @return array{itens: array<int, array<string, mixed>>, totais: array<string, mixed>}
     */
    public function paraCompetencia(int $userId, CarbonImmutable $competencia): array
    {
        $vigentes = $this->vigentes($userId, $competencia);

        if ($vigentes->isEmpty()) {
            return ['itens' => [], 'totais' => $this->totais([])];
        }

        $gastos = $this->gastosPorCategoria($userId, $competencia);
        $categorias = Categoria::withoutGlobalScopes()
            ->whereIn('id', $vigentes->keys())
            ->get()
            ->keyBy('id');

        $itens = $vigentes
            ->map(function (Orcamento $orcamento, int $categoriaId) use ($gastos, $categorias) {
                $categoria = $categorias->get($categoriaId);
                $limite = (float) $orcamento->valor_limite;
                $gasto = (float) ($gastos[$categoriaId] ?? 0);

                return [
                    'id'           => $orcamento->id,
                    'categoria_id' => $categoriaId,
                    'categoria'    => $categoria?->nome ?? 'Categoria removida',
                    'tipo'         => $categoria?->tipo->value,
                    'limite'       => round($limite, 2),
                    'gasto'        => round($gasto, 2),
                    'restante'     => round($limite - $gasto, 2),
                    'percentual'   => $this->percentual($gasto, $limite),
                    'status'       => $this->status($gasto, $limite),
                    'recorrente'   => $orcamento->ehRecorrente(),
                ];
            })
            ->sortByDesc('percentual')
            ->values()
            ->all();

        return ['itens' => $itens, 'totais' => $this->totais($itens)];
    }

    /**
     * Orçamento vigente de cada categoria, indexado por categoria_id.
     *
     * @return Collection<int, Orcamento>
     */
    private function vigentes(int $userId, CarbonImmutable $competencia): Collection
    {
        $base = Orcamento::withoutGlobalScope('doUsuario')->where('user_id', $userId);

        $recorrentes = (clone $base)->recorrentes()->get()->keyBy('categoria_id');

        $especificos = (clone $base)
            ->daCompetencia($competencia->year, $competencia->month)
            ->get()
            ->keyBy('categoria_id');

        /*
         * `replace`, não `merge`: merge usa array_merge por baixo, que REINDEXA
         * chaves numéricas — os categoria_id viravam 0, 1, 2 e nada mais casava
         * com os gastos. replace preserva as chaves e sobrescreve as repetidas,
         * que é exatamente a regra: o específico do mês vence o recorrente.
         */
        return $recorrentes->replace($especificos);
    }

    /**
     * Gasto de cada categoria RAIZ na competência.
     *
     * O orçamento existe só na categoria principal, mas os lançamentos moram
     * nas subcategorias. Somar por `categoria_id` exato deixaria todo orçamento
     * eternamente zerado: quem definiu R$ 1.500 em Moradia e lançou R$ 900 em
     * "Moradia › Aluguel" veria consumo zero e um limite intacto que não
     * existe mais.
     *
     * Por isso a chave é a raiz — `COALESCE(categoria_pai_id, id)`. Um gasto
     * direto na mãe e um gasto em qualquer filha caem no mesmo balde.
     *
     * @return Collection<int, float>
     */
    private function gastosPorCategoria(int $userId, CarbonImmutable $competencia): Collection
    {
        return Gasto::withoutGlobalScope('doUsuario')
            ->where('gastos.user_id', $userId)
            ->daCompetencia($competencia->year, $competencia->month)
            ->join('categorias', 'categorias.id', '=', 'gastos.categoria_id')
            ->groupBy('raiz')
            ->selectRaw(Categoria::expressaoRaiz() . ' as raiz, SUM(gastos.valor) as total')
            ->pluck('total', 'raiz')
            ->map(fn ($total) => (float) $total);
    }

    /**
     * Proporção de categorias que fecharam dentro do limite.
     *
     * É o quinto indicador da saúde financeira. Devolve null quando não há
     * orçamento definido — sem base, o peso é redistribuído entre os demais em
     * vez de virar nota zero, que puniria quem simplesmente ainda não usa a
     * funcionalidade.
     */
    public function cumprimento(int $userId, CarbonImmutable $competencia): ?float
    {
        $itens = $this->paraCompetencia($userId, $competencia)['itens'];

        if ($itens === []) {
            return null;
        }

        $dentro = count(array_filter($itens, fn ($item) => $item['status'] !== 'estourado'));

        return $dentro / count($itens);
    }

    /**
     * @param  array<int, array<string, mixed>>  $itens
     * @return array<string, mixed>
     */
    private function totais(array $itens): array
    {
        $limite = array_sum(array_column($itens, 'limite'));
        $gasto = array_sum(array_column($itens, 'gasto'));
        $status = array_count_values(array_column($itens, 'status'));

        return [
            'quantidade' => count($itens),
            'limite'     => round($limite, 2),
            'gasto'      => round($gasto, 2),
            'restante'   => round($limite - $gasto, 2),
            'percentual' => $this->percentual($gasto, $limite),
            'normais'    => $status['normal'] ?? 0,
            'atencao'    => $status['atencao'] ?? 0,
            'estourados' => $status['estourado'] ?? 0,
        ];
    }

    /** Denominador zero devolve 0.0 — nunca INF nem NAN. */
    private function percentual(float $gasto, float $limite): float
    {
        if ($limite <= 0.0) {
            return 0.0;
        }

        return round(($gasto / $limite) * 100, 1);
    }

    private function status(float $gasto, float $limite): string
    {
        if ($limite <= 0.0) {
            return 'sem_limite';
        }

        return match (true) {
            $gasto > $limite                       => 'estourado',
            $gasto >= $limite * self::LIMIAR_ATENCAO => 'atencao',
            default                                => 'normal',
        };
    }
}
