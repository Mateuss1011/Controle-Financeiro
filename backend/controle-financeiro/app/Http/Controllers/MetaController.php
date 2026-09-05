<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMetaRequest;
use App\Http\Requests\UpdateMetaRequest;
use App\Models\Meta;
use App\Services\Financeiro\MetaService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Metas financeiras.
 *
 * A resposta já traz os números derivados — percentual, restante, aporte mensal
 * e status. O cliente não recalcula nada: as mesmas regras de borda (meta sem
 * prazo, prazo vencido, objetivo zero) valem para a estimativa de "quanto posso
 * gastar", e duplicá-las no frontend seria pedir para os dois divergirem.
 */
class MetaController extends Controller
{
    public function __construct(private readonly MetaService $metas)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $resultado = $this->metas->listar($request->user()->id);

        return response()->json([
            'data'   => $resultado['itens'],
            'resumo' => $resultado['resumo'],
        ]);
    }

    public function store(StoreMetaRequest $request): JsonResponse
    {
        $meta = Meta::create([
            ...$request->validated(),
            'user_id'     => $request->user()->id,
            'valor_atual' => $request->validated('valor_atual') ?? 0,
        ]);

        $this->metas->sincronizarConclusao($meta);

        return response()->json(['data' => $this->detalhar($meta)], 201);
    }

    public function update(UpdateMetaRequest $request, Meta $meta): JsonResponse
    {
        $this->authorize('update', $meta);

        $meta->update($request->validated());
        $this->metas->sincronizarConclusao($meta);

        return response()->json(['data' => $this->detalhar($meta)]);
    }

    public function destroy(Meta $meta): JsonResponse
    {
        $this->authorize('delete', $meta);

        $meta->delete();

        return response()->json(['message' => 'Meta excluída com sucesso.']);
    }

    /** @return array<string, mixed> */
    private function detalhar(Meta $meta): array
    {
        return $this->metas->detalhar(
            $meta->refresh(),
            CarbonImmutable::now()->startOfDay(),
        );
    }
}
