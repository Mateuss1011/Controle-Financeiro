<?php

namespace App\Http\Controllers;

use App\Enums\TipoCategoria;
use App\Http\Requests\StoreGastoRequest;
use App\Http\Requests\UpdateGastoRequest;
use App\Http\Resources\GastoResource;
use App\Models\Gasto;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GastoController extends Controller
{
    /**
     * Listagem paginada e filtrável. Antes retornava a tabela inteira sem
     * filtro algum, e todo o cálculo era feito no navegador.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $validado = $request->validate([
            'competencia' => ['nullable', 'date_format:Y-m'],
            'inicio'      => ['nullable', 'date'],
            'fim'         => ['nullable', 'date', 'after_or_equal:inicio'],
            'categoria_id'=> ['nullable', 'integer'],
            'tipo'        => ['nullable', 'string', 'in:' . implode(',', TipoCategoria::valores())],
            'busca'       => ['nullable', 'string', 'max:100'],
            'ordenar_por' => ['nullable', 'in:data,valor,descricao'],
            'direcao'     => ['nullable', 'in:asc,desc'],
            'por_pagina'  => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        // `categoria.pai` junto: a lista mostra o caminho "Moradia > Aluguel", e
        // sem o pai carregado seria uma consulta por linha.
        $query = $this->comFiltros(Gasto::with('categoria.pai'), $validado);

        /*
         * O total do RESULTADO FILTRADO, não o da página.
         *
         * Num app financeiro o filtro existe justamente para responder "quanto
         * eu gastei com desejos neste mês?". Somar só os 20 itens visíveis
         * responderia outra pergunta — e enganaria quem tem 87 lançamentos.
         */
        $total = (float) (clone $query)->sum('valor');

        $query->orderBy($validado['ordenar_por'] ?? 'data', $validado['direcao'] ?? 'desc')
            ->orderBy('id', 'desc');

        return GastoResource::collection(
            $query->paginate($validado['por_pagina'] ?? 20)->withQueryString()
        )->additional([
            'resumo' => ['total' => round($total, 2)],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filtros
     */
    private function comFiltros(Builder $query, array $filtros): Builder
    {
        if (! empty($filtros['competencia'])) {
            [$ano, $mes] = explode('-', $filtros['competencia']);
            $query->daCompetencia((int) $ano, (int) $mes);
        }

        if (! empty($filtros['inicio']) && ! empty($filtros['fim'])) {
            $query->entre($filtros['inicio'], $filtros['fim']);
        }

        /*
         * Filtrar por "Moradia" traz a ÁRVORE: o que está direto nela e o que
         * está em qualquer subcategoria dela. Filtrar pelo id exato deixaria de
         * fora justamente os lançamentos mais específicos, e a lista mostraria
         * menos do que o Dashboard soma para a mesma categoria.
         *
         * Filtrar por uma subcategoria continua funcionando e devolve só ela.
         */
        if (! empty($filtros['categoria_id'])) {
            $id = (int) $filtros['categoria_id'];

            $query->whereIn('categoria_id', function ($sub) use ($id) {
                $sub->select('id')->from('categorias')
                    ->where('id', $id)
                    ->orWhere('categoria_pai_id', $id);
            });
        }

        if (! empty($filtros['tipo'])) {
            $query->whereHas('categoria', fn ($q) => $q->where('tipo', $filtros['tipo']));
        }

        if (! empty($filtros['busca'])) {
            $query->where('descricao', 'like', '%' . $filtros['busca'] . '%');
        }

        return $query;
    }

    public function store(StoreGastoRequest $request): JsonResponse
    {
        $gasto = Gasto::create($request->validated());

        return (new GastoResource($gasto->load('categoria.pai')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Gasto $gasto): GastoResource
    {
        $this->authorize('view', $gasto);

        return new GastoResource($gasto->load('categoria.pai'));
    }

    public function update(UpdateGastoRequest $request, Gasto $gasto): GastoResource
    {
        $this->authorize('update', $gasto);

        $gasto->update($request->validated());

        return new GastoResource($gasto->load('categoria.pai'));
    }

    public function destroy(Gasto $gasto): JsonResponse
    {
        $this->authorize('delete', $gasto);

        $gasto->delete();

        return response()->json(['message' => 'Lançamento excluído com sucesso.']);
    }
}
