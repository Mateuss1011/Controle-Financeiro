<?php

namespace App\Http\Requests;

use App\Enums\TipoCategoria;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoriaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nome' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('categorias', 'nome')
                    ->where('user_id', $this->user()->id)
                    ->ignore($this->route('categoria')),
            ],
            'tipo' => ['sometimes', 'required', Rule::enum(TipoCategoria::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'Informe o nome da categoria.',
            'nome.unique'   => 'Você já tem uma categoria com esse nome.',
            'tipo.required' => 'Selecione o tipo da categoria.',
            'tipo.enum'     => 'O tipo deve ser necessidade, desejo ou poupanca.',
        ];
    }
}
