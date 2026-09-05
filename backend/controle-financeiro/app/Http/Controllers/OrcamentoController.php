<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrcamentoRequest;
use App\Http\Resources\OrcamentoResource;
use App\Models\Orcamento;
use App\Services\Financeiro\OrcamentoService;
use App\Services\Financeiro\PeriodoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrcamentoController extends Controller
{
    public function __construct(
        private readonly OrcamentoService $orcamentos,
        private readonly PeriodoService $periodos,
    ) {
    }

    /**
     * Orçamentos vigentes na competência, já confrontados com o gasto real.
     *
     * A tela precisa das duas coisas juntas — limite e quanto já se gastou —
     * para poder dizer qualquer coisa útil; buscar separado só abriria espaço
     * para mostrar números de meses diferentes durante o carregamento.
     */
    public function index(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'competencia' => ['nullable', 'date_format:Y-m'],
        ]);

        $competencia = $this->periodos->daString($validado['competencia'] ?? null)
            ?? $this->periodos->atual();

        $resultado = $this->orcamentos->paraCompetencia($request->user()->id, $competencia);

        return response()->json([
            'data'   => $resultado['itens'],
            'resumo' => [
                'competencia'        => $competencia->format(PeriodoService::FORMATO),
                'competencia_rotulo' => $this->periodos->rotulo($competencia),
                ...$resultado['totais'],
            ],
        ]);
    }

    public function store(StoreOrcamentoRequest $request): JsonResponse
    {
        $competencia = $this->periodos->daString($request->validated('competencia'));

        $orcamento = $this->orcamentos->registrar(
            userId: $request->user()->id,
            categoriaId: (int) $request->validated('categoria_id'),
            limite: (float) $request->validated('valor_limite'),
            competencia: $competencia,
        );

        return (new OrcamentoResource($orcamento))
            ->response()
            ->setStatusCode($orcamento->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Orcamento $orcamento): JsonResponse
    {
        $this->authorize('delete', $orcamento);

        $orcamento->delete();

        return response()->json(['message' => 'Orçamento excluído com sucesso.']);
    }
}
