<?php

namespace App\Services\Financeiro;

use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Orcamento;
use Illuminate\Support\Collection;

/**
 * O catálogo de categorias como a interface precisa dele: em árvore, com o uso
 * já contado e com a decisão de exclusão respondida.
 *
 * Existe para que o controller não precise saber que a contagem de uma
 * categoria principal inclui as filhas, nem que a exclusão tem quatro
 * dependências a conferir.
 */
class CatalogoDeCategoriasService
{
    /**
     * Categorias principais visíveis, cada uma com as filhas carregadas e as
     * contagens resolvidas.
     *
     * Três consultas no total, independentemente de quantas categorias
     * existam: uma para a árvore, uma para os lançamentos e uma para os
     * orçamentos. Contar dentro do laço seria o N+1 clássico — com o catálogo
     * de ~40 principais e ~90 subcategorias, seriam mais de cem viagens ao
     * banco para desenhar uma tela.
     *
     * @return Collection<int, Categoria>
     */
    public function arvore(): Collection
    {
        $principais = Categoria::principais()
            ->with(['filhas' => fn ($q) => $q->orderBy('nome')])
            ->orderBy('tipo')
            ->orderBy('nome')
            ->get();

        $usoDireto = $this->lancamentosPorCategoria();
        $usoPorRaiz = $this->lancamentosPorRaiz();

        foreach ($principais as $categoria) {
            $categoria->gastos_count = $usoDireto[$categoria->id] ?? 0;
            // Acumulado: o número que decide se dá para excluir.
            $categoria->total_lancamentos = $usoPorRaiz[$categoria->id] ?? 0;

            foreach ($categoria->filhas as $filha) {
                $filha->gastos_count = $usoDireto[$filha->id] ?? 0;
                // Numa folha, direto e acumulado são a mesma coisa.
                $filha->total_lancamentos = $filha->gastos_count;
            }
        }

        return $principais;
    }

    /**
     * O que impede esta categoria de ser excluída, ou null se nada impede.
     *
     * @return array<string, mixed>|null
     */
    public function impedimentoParaExcluir(Categoria $categoria): ?array
    {
        $lancamentos = $this->contarLancamentosDaArvore($categoria);
        $orcamentos = $this->contarOrcamentosDaArvore($categoria);
        $subcategorias = $categoria->ehPrincipal()
            ? Categoria::withoutGlobalScope('visiveis')->where('categoria_pai_id', $categoria->id)->count()
            : 0;

        if ($lancamentos > 0) {
            $ondeEstao = $categoria->ehPrincipal() && $lancamentos > ($this->lancamentosPorCategoria()[$categoria->id] ?? 0)
                ? ' (contando os das subcategorias)'
                : '';

            return [
                'message' => $lancamentos === 1
                    ? "Esta categoria tem 1 lançamento{$ondeEstao} e não pode ser excluída."
                    : "Esta categoria tem {$lancamentos} lançamentos{$ondeEstao} e não pode ser excluída.",
                'motivo'            => 'lancamentos',
                'total_lancamentos' => $lancamentos,
                'total_orcamentos'  => $orcamentos,
                'subcategorias'     => $subcategorias,
            ];
        }

        if ($orcamentos > 0) {
            return [
                'message' => $orcamentos === 1
                    ? 'Esta categoria tem 1 orçamento definido e não pode ser excluída.'
                    : "Esta categoria tem {$orcamentos} orçamentos definidos e não pode ser excluída.",
                'motivo'            => 'orcamentos',
                'total_lancamentos' => 0,
                'total_orcamentos'  => $orcamentos,
                'subcategorias'     => $subcategorias,
            ];
        }

        if ($subcategorias > 0) {
            return [
                'message' => $subcategorias === 1
                    ? 'Esta categoria tem 1 subcategoria. Exclua a subcategoria primeiro.'
                    : "Esta categoria tem {$subcategorias} subcategorias. Exclua as subcategorias primeiro.",
                'motivo'            => 'subcategorias',
                'total_lancamentos' => 0,
                'total_orcamentos'  => 0,
                'subcategorias'     => $subcategorias,
            ];
        }

        return null;
    }

    /** Lançamentos na categoria e, se for principal, em todas as filhas. */
    private function contarLancamentosDaArvore(Categoria $categoria): int
    {
        return Gasto::whereIn('categoria_id', $this->idsDaArvore($categoria))->count();
    }

    private function contarOrcamentosDaArvore(Categoria $categoria): int
    {
        return Orcamento::whereIn('categoria_id', $this->idsDaArvore($categoria))->count();
    }

    /** @return array<int, int> */
    private function idsDaArvore(Categoria $categoria): array
    {
        $ids = [$categoria->id];

        if ($categoria->ehPrincipal()) {
            $ids = array_merge($ids, Categoria::withoutGlobalScope('visiveis')
                ->where('categoria_pai_id', $categoria->id)
                ->pluck('id')->all());
        }

        return $ids;
    }

    /**
     * Lançamentos por categoria_id exato. O escopo global de Gasto garante que
     * a contagem é do uso de quem pede.
     *
     * @return array<int, int>
     */
    private function lancamentosPorCategoria(): array
    {
        return Gasto::query()
            ->groupBy('categoria_id')
            ->selectRaw('categoria_id, COUNT(*) as total')
            ->pluck('total', 'categoria_id')
            ->map(fn ($n) => (int) $n)
            ->all();
    }

    /**
     * Lançamentos por categoria RAIZ: o gasto em "Moradia › Aluguel" conta para
     * Moradia.
     *
     * @return array<int, int>
     */
    private function lancamentosPorRaiz(): array
    {
        return Gasto::query()
            ->join('categorias', 'categorias.id', '=', 'gastos.categoria_id')
            ->groupBy('raiz')
            ->selectRaw(Categoria::expressaoRaiz() . ' as raiz, COUNT(*) as total')
            ->pluck('total', 'raiz')
            ->map(fn ($n) => (int) $n)
            ->all();
    }
}
