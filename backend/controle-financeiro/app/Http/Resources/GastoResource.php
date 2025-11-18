<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GastoResource extends JsonResource
{

    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'descricao' => $this->descricao,
            'valor' => $this->valor,
            'data' => $this->data,
            'categoria' => new CategoriaResource($this->whenLoaded('categoria')),
            'salario' => new SalarioResource($this->whenLoaded('salario')),
        ];
    }
}
