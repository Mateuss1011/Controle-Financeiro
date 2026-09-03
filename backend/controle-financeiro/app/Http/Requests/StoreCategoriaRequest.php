<?php

namespace App\Http\Requests;

use App\Enums\TipoCategoria;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoriaRequest extends FormRequest
{
    /**
     * `tipo` passa a ser obrigatório e explícito. Antes ele era omitido pelo
     * controller e o MariaDB gravava silenciosamente o primeiro valor do ENUM
     * ('necessidade'), classificando a categoria errado na regra 50/30/20.
     */
    public function rules(): array
    {
        return [
            'nome' => [
                'required',
                'string',
                'max:100',
                Rule::unique('categorias', 'nome')->where('user_id', $this->user()->id),
            ],
            'tipo' => ['required', Rule::enum(TipoCategoria::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o nome da categoria.',
            'nome.unique'   => 'Você já tem uma categoria com esse nome.',
            'nome.max'      => 'O nome deve ter no máximo 100 caracteres.',
            'tipo.required' => 'Selecione o tipo da categoria.',
            'tipo.enum'     => 'O tipo deve ser necessidade, desejo ou poupanca.',
        ];
    }
}
