<?php

namespace App\Http\Controllers;

use App\Services\Financeiro\RegraCincoTrintaVinteService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Regra 50/30/20 de uma competência.
 *
 * Substitui o antigo `SalarioController@regra`, que devolvia só os limites
 * (valor × 0.5 / 0.3 / 0.2) sem olhar um único gasto.
 */
class RegraController extends Controller
{
    public function __construct(private readonly RegraCincoTrintaVinteService $regra)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $validado = $request->validate([
            'competencia' => ['nullable', 'date_format:Y-m'],
        ]);

        $competencia = isset($validado['competencia'])
            ? CarbonImmutable::createFromFormat('Y-m', $validado['competencia'])->startOfMonth()
            : CarbonImmutable::now()->startOfMonth();

        return response()->json([
            'data' => [
                'competencia' => $competencia->format('Y-m'),
                ...$this->regra->calcular($request->user()->id, $competencia),
            ],
        ]);
    }
}
