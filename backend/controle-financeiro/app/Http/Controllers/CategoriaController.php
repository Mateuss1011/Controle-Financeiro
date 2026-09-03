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
            Categoria::orderBy('tipo')->orderBy('nome')->get()
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

        // Os gastos têm FK com onDelete cascade; avisar é melhor que apagar em silêncio.
        if ($categoria->gastos()->exists()) {
            return response()->json([
                'message' => 'Esta categoria possui lançamentos e não pode ser excluída.',
            ], 422);
        }

        $categoria->delete();

        return response()->json(['message' => 'Categoria excluída com sucesso.']);
    }
}
