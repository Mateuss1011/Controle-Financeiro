<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A data do lançamento é exposta como `data_lancamento`, e não como `data`.
 *
 * Motivo: o JsonResource do Laravel envelopa a resposta numa chave `data` e,
 * ao encontrar uma chave `data` no payload, assume que a resposta já veio
 * envelopada e devolve o recurso CRU. Com o campo chamado `data`, um GET de
 * item vinha sem envelope e um GET de lista vinha com — contrato inconsistente.
 *
 * @mixin \App\Models\Gasto
 */
class GastoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'descricao'       => $this->descricao,
            'valor'           => (float) $this->valor,
            'data_lancamento' => $this->data?->toDateString(),
            'categoria'       => new CategoriaResource($this->whenLoaded('categoria')),
            'criado_em'       => $this->created_at?->toIso8601String(),
        ];
    }
}
