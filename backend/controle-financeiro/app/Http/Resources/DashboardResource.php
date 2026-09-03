<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * O DashboardService já devolve a estrutura final da resposta; este Resource
 * existe para manter o contrato de envelope `data` igual ao do resto da API e
 * para serializar os últimos lançamentos pelo GastoResource, em vez de expor o
 * model cru.
 */
class DashboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource,
            'ultimos_lancamentos' => GastoResource::collection($this->resource['ultimos_lancamentos']),
        ];
    }
}
