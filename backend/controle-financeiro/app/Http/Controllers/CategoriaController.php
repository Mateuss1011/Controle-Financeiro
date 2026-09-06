<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoriaRequest;
use App\Http\Requests\UpdateCategoriaRequest;
use App\Http\Resources\CategoriaResource;
use App\Models\Categoria;
use App\Services\Financeiro\CatalogoDeCategoriasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoriaController extends Controller
{
    public function __construct(private readonly CatalogoDeCategoriasService $catalogo)
    {
    }

    /**
     * Catálogo visível: globais do sistema mais as privadas do usuário, em
     * árvore de dois níveis e com as contagens de uso já resolvidas.
     */
    public function index(): AnonymousResourceCollection
    {
        return CategoriaResource::collection($this->catalogo->arvore());
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

        return new CategoriaResource($categoria->fresh());
    }

    /**
     * A exclusão é decidida pela APLICAÇÃO, não pelo cascade do banco.
     *
     * As foreign keys existem para integridade estrutural, mas usá-las como
     * regra de negócio significaria apagar lançamentos em silêncio: o cascade
     * de `gastos.categoria_id` levaria junto todo o histórico da categoria — e
     * o de `categoria_pai_id` levaria as subcategorias e os lançamentos delas.
     * Perder meses de registro por um clique não é comportamento aceitável.
     */
    public function destroy(Categoria $categoria): JsonResponse
    {
        $this->authorize('delete', $categoria);

        $impedimento = $this->catalogo->impedimentoParaExcluir($categoria);

        if ($impedimento !== null) {
            return response()->json($impedimento, 422);
        }

        $categoria->delete();

        return response()->json([
            'message' => $categoria->ehSubcategoria()
                ? 'Subcategoria excluída com sucesso.'
                : 'Categoria excluída com sucesso.',
        ]);
    }
}
