<?php

namespace App\Http\Requests;

use App\Models\Categoria;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreGastoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'descricao'    => ['required', 'string', 'max:255'],
            'valor'        => ['required', 'numeric', 'gt:0', 'max:99999999.99'],
            'data'         => ['required', 'date'],
            'categoria_id' => ['required', 'integer'],
        ];
    }

    /**
     * A categoria precisa existir E ser visível para quem está pedindo — global
     * ou do próprio usuário. Validar com `exists:categorias,id` permitiria
     * associar um gasto a uma categoria privada de outro usuário.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $id = $this->input('categoria_id');

                if ($id === null || $validator->errors()->has('categoria_id')) {
                    return;
                }

                if (! Categoria::whereKey($id)->exists()) {
                    $validator->errors()->add('categoria_id', 'A categoria selecionada é inválida.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'descricao.required'    => 'A descrição é obrigatória.',
            'descricao.max'         => 'A descrição deve ter no máximo 255 caracteres.',
            'valor.required'        => 'Informe o valor do lançamento.',
            'valor.numeric'         => 'O valor deve ser um número.',
            'valor.gt'              => 'O valor deve ser maior que zero.',
            'data.required'         => 'Informe a data do lançamento.',
            'data.date'             => 'Informe uma data válida.',
            'categoria_id.required' => 'Selecione uma categoria.',
        ];
    }
}
