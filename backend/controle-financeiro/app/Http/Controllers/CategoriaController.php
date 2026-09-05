<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoriaRequest;
use App\Http\Requests\UpdateCategoriaRequest;
use App\Http\Resources\CategoriaResource;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoriaController extends Controller
{
    /** Categorias globais do sistema + as privadas do usuário autenticado. */
    public function index(): AnonymousResourceCollection
    {
        return CategoriaResource::collection(
            Categoria::withCount('gastos')->orderBy('tipo')->orderBy('nome')->get()
        );
    }

    public function store(StoreCategoriaRequest $request): JsonResponse
    {
        $categoria = Categoria::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return (new CategoriaResource($categoria))->response()->setStatusCode(201);
    }

    public function show(Categoria $categoria): CategoriaResource
    {
        $this->authorize('view', $categoria);

        return new CategoriaResource($categoria);
    }

    public function update(UpdateCategoriaRequest $request, Categoria $categoria): CategoriaResource
    {
        $this->authorize('update', $categoria);

        $categoria->update($request->validated());

        return new CategoriaResource($categoria);
    }

    public function destroy(Categoria $categoria): JsonResponse
    {
        $this->authorize('delete', $categoria);

        // Os gastos têm FK com onDelete cascade; avisar é melhor que apagar em
        // silêncio. O número entra na mensagem para o usuário saber o tamanho
        // do trabalho de reclassificar antes de tentar de novo.
        $lancamentos = $categoria->gastos()->count();

        if ($lancamentos > 0) {
            return response()->json([
                'message' => $lancamentos === 1
                    ? 'Esta categoria tem 1 lançamento e não pode ser excluída.'
                    : "Esta categoria tem {$lancamentos} lançamentos e não pode ser excluída.",
                'total_lancamentos' => $lancamentos,
            ], 422);
        }

        $categoria->delete();

        return response()->json(['message' => 'Categoria excluída com sucesso.']);
    }
}
