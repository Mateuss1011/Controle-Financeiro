<?php

namespace App\Http\Controllers;

use App\Enums\TipoCategoria;
use App\Http\Requests\StoreGastoRequest;
use App\Http\Requests\UpdateGastoRequest;
use App\Http\Resources\GastoResource;
use App\Models\Gasto;
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

        $query = Gasto::with('categoria');

        if (! empty($validado['competencia'])) {
            [$ano, $mes] = explode('-', $validado['competencia']);
            $query->daCompetencia((int) $ano, (int) $mes);
        }

        if (! empty($validado['inicio']) && ! empty($validado['fim'])) {
            $query->entre($validado['inicio'], $validado['fim']);
        }

        if (! empty($validado['categoria_id'])) {
            $query->where('categoria_id', $validado['categoria_id']);
        }

        if (! empty($validado['tipo'])) {
            $query->whereHas('categoria', fn ($q) => $q->where('tipo', $validado['tipo']));
        }

        if (! empty($validado['busca'])) {
            $query->where('descricao', 'like', '%' . $validado['busca'] . '%');
        }

        $query->orderBy($validado['ordenar_por'] ?? 'data', $validado['direcao'] ?? 'desc')
            ->orderBy('id', 'desc');

        return GastoResource::collection(
            $query->paginate($validado['por_pagina'] ?? 20)->withQueryString()
        );
    }

    public function store(StoreGastoRequest $request): JsonResponse
    {
        $gasto = Gasto::create($request->validated());

        return (new GastoResource($gasto->load('categoria')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Gasto $gasto): GastoResource
    {
        $this->authorize('view', $gasto);

        return new GastoResource($gasto->load('categoria'));
    }

    public function update(UpdateGastoRequest $request, Gasto $gasto): GastoResource
    {
        $this->authorize('update', $gasto);

        $gasto->update($request->validated());

        return new GastoResource($gasto->load('categoria'));
    }

    public function destroy(Gasto $gasto): JsonResponse
    {
        $this->authorize('delete', $gasto);

        $gasto->delete();

        return response()->json(['message' => 'Lançamento excluído com sucesso.']);
    }
}
