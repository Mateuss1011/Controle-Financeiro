<?php

namespace App\Http\Controllers;

use App\Http\Resources\DashboardResource;
use App\Services\Financeiro\DashboardService;
use Illuminate\Http\Request;

/**
 * Endpoint agregado do Dashboard.
 *
 * Controller fino: valida a entrada, delega ao serviço, devolve o Resource.
 * Nenhuma regra de negócio aqui.
 */
class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboard)
    {
    }

    public function __invoke(Request $request): DashboardResource
    {
        $validado = $request->validate([
            'competencia' => ['nullable', 'date_format:Y-m'],
        ]);

        return new DashboardResource(
            $this->dashboard->montar($request->user()->id, $validado['competencia'] ?? null)
        );
    }
}
