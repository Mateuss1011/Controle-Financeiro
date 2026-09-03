<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Categoria
 */
class CategoriaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'      => $this->id,
            'nome'    => $this->nome,
            'tipo'    => $this->tipo->value,
            'rotulo_tipo' => $this->tipo->rotulo(),
            'global'  => $this->ehGlobal(),
        ];
    }
}
