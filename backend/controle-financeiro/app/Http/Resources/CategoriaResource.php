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
            'id'               => $this->id,
            'nome'             => $this->nome,
            'tipo'             => $this->tipo->value,
            'rotulo_tipo'      => $this->tipo->rotulo(),
            'global'           => $this->ehGlobal(),
            'categoria_pai_id' => $this->categoria_pai_id,
            'subcategoria'     => $this->ehSubcategoria(),

            // Nome da mãe, quando a relação vier carregada. Sem ele, um
            // lançamento em "Aluguel" apareceria na lista como "Aluguel" e
            // ninguém saberia de qual categoria ele veio.
            'categoria_pai'    => $this->whenLoaded('pai', fn () => $this->pai?->nome),

            // Só na listagem, que é a única consulta que carrega as contagens.
            //
            // `total_lancamentos` é ACUMULADO: numa categoria principal soma os
            // lançamentos dela e os de todas as filhas, porque é esse o número
            // que decide se ela pode ser excluída. `lancamentos_diretos` é o
            // que aponta para ela sozinha — a diferença entre os dois é o que
            // vive nas subcategorias.
            'total_lancamentos'    => $this->when(isset($this->total_lancamentos), fn () => (int) $this->total_lancamentos),
            'lancamentos_diretos'  => $this->whenCounted('gastos'),

            'subcategorias' => CategoriaResource::collection($this->whenLoaded('filhas')),
        ];
    }
}
