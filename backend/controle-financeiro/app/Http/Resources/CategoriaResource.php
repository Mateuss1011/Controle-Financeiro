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
            // Só na listagem, que é a única consulta que carrega a contagem.
            // A tela de Categorias precisa dela para dizer, ANTES do clique, se
            // a exclusão vai ser recusada — e o escopo global de Gasto já
            // garante que o número é o uso de quem está pedindo.
            'total_lancamentos' => $this->whenCounted('gastos'),
        ];
    }
}
