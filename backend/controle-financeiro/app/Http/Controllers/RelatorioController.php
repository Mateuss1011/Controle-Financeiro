<?php

namespace App\Http\Controllers;

use App\Services\Financeiro\RelatorioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint agregado do relatório.
 *
 * Mesma razão do Dashboard: evolução, ranking de categorias e composição
 * 50/30/20 precisam falar do MESMO intervalo. Buscar cada peça separadamente
 * abriria espaço para a tela mostrar períodos diferentes lado a lado enquanto
 * carrega.
 *
 * Controller fino: valida a entrada, delega ao serviço, devolve o envelope.
 */
class RelatorioController extends Controller
{
    public function __construct(private readonly RelatorioService $relatorios)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'de'  => ['nullable', 'date_format:Y-m'],
            'ate' => ['nullable', 'date_format:Y-m'],
        ], [
            'de.date_format'  => 'O período inicial deve estar no formato AAAA-MM.',
            'ate.date_format' => 'O período final deve estar no formato AAAA-MM.',
        ]);

        return response()->json([
            'data' => $this->relatorios->montar(
                $request->user()->id,
                $validado['de'] ?? null,
                $validado['ate'] ?? null,
            ),
        ]);
    }
}
