<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRendaRequest;
use App\Http\Resources\RendaResource;
use App\Models\Salario;
use App\Services\Financeiro\RendaService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Rendas do usuário (tabela `salarios`, decisão A5).
 */
class RendaController extends Controller
{
    public function __construct(private readonly RendaService $rendas)
    {
    }

    /**
     * Histórico de rendas, da competência mais recente para a mais antiga.
     *
     * `data` mantém o formato já consumido pelo frontend; o contexto que a
     * lista sozinha não conta — competência atual, média do último ano e
     * variação mês a mês — vai em `resumo`.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        return RendaResource::collection(
            Salario::orderByDesc('competencia')->get()
        )->additional([
            'resumo' => $this->rendas->contextoDoHistorico($request->user()->id),
        ]);
    }

    /**
     * Cria OU atualiza a renda da competência.
     *
     * Corrige o bug em que cada envio do formulário criava um novo registro:
     * o controller antigo respondia apenas `{message}`, sem id, e o frontend
     * nunca conseguia guardar a referência para atualizar.
     */
    public function store(StoreRendaRequest $request): JsonResponse
    {
        $renda = $this->rendas->registrar(
            userId: $request->user()->id,
            competencia: CarbonImmutable::createFromFormat('Y-m', $request->validated('competencia'))->startOfMonth(),
            valor: (float) $request->validated('valor'),
            descricao: $request->validated('descricao'),
        );

        return (new RendaResource($renda))
            ->response()
            ->setStatusCode($renda->wasRecentlyCreated ? 201 : 200);
    }

    /** Renda de uma competência específica (formato AAAA-MM). */
    public function daCompetencia(Request $request, string $competencia): JsonResponse
    {
        $data = CarbonImmutable::canBeCreatedFromFormat($competencia, 'Y-m')
            ? CarbonImmutable::createFromFormat('Y-m', $competencia)->startOfMonth()
            : null;

        if (! $data) {
            return response()->json(['message' => 'Competência inválida. Use o formato AAAA-MM.'], 422);
        }

        $renda = $this->rendas->daCompetencia($request->user()->id, $data);

        return response()->json([
            'data' => $renda ? new RendaResource($renda) : null,
        ]);
    }

    public function show(Salario $renda): RendaResource
    {
        $this->authorize('view', $renda);

        return new RendaResource($renda);
    }

    public function destroy(Salario $renda): JsonResponse
    {
        $this->authorize('delete', $renda);

        $renda->delete();

        return response()->json(['message' => 'Renda excluída com sucesso.']);
    }
}
