<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Salario
 */
class RendaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'valor'       => (float) $this->valor,
            'competencia' => $this->competencia?->format('Y-m'),
            'descricao'   => $this->descricao,
        ];
    }
}
