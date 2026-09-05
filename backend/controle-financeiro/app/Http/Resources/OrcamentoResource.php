<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Orcamento
 */
class OrcamentoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'categoria_id' => $this->categoria_id,
            'valor_limite' => (float) $this->valor_limite,
            'competencia'  => $this->competencia?->format('Y-m'),
            'recorrente'   => $this->ehRecorrente(),
        ];
    }
}
