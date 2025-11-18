<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalarioResource extends JsonResource
{

    public function toArray($request)
    {
        return [
            'id'    => $this->id,
            'valor' => $this->valor,
            'data'  => $this->data,
        ];
    }
}
