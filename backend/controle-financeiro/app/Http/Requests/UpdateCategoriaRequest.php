<?php

namespace App\Http\Requests;

use App\Enums\TipoCategoria;
use Illuminate\Validation\Rule;

/**
 * Edição de categoria.
 *
 * Herda de Store apenas a regra de unicidade — a mesma pergunta ("esse nome já
 * está visível para mim?") com uma exceção: a própria categoria editada.
 */
class UpdateCategoriaRequest extends StoreCategoriaRequest
{
    public function rules(): array
    {
        return [
            'nome' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                $this->nomeInedito()->ignore($this->route('categoria')),
            ],
            'tipo' => ['sometimes', 'required', Rule::enum(TipoCategoria::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o nome da categoria.',
            'nome.unique'   => 'Já existe uma categoria com esse nome.',
            'nome.max'      => 'O nome deve ter no máximo 100 caracteres.',
            'tipo.required' => 'Selecione o tipo da categoria.',
            'tipo.enum'     => 'O tipo deve ser necessidade, desejo ou poupanca.',
        ];
    }
}
