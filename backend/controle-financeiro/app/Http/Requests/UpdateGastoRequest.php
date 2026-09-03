<?php

namespace App\Http\Requests;

use App\Models\Categoria;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateGastoRequest extends FormRequest
{
    /**
     * `sometimes` permite atualização parcial (PATCH) sem tornar os campos
     * opcionais quando eles são de fato enviados.
     */
    public function rules(): array
    {
        return [
            'descricao'    => ['sometimes', 'required', 'string', 'max:255'],
            'valor'        => ['sometimes', 'required', 'numeric', 'gt:0', 'max:99999999.99'],
            'data'         => ['sometimes', 'required', 'date'],
            'categoria_id' => ['sometimes', 'required', 'integer'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! $this->has('categoria_id') || $validator->errors()->has('categoria_id')) {
                    return;
                }

                if (! Categoria::whereKey($this->input('categoria_id'))->exists()) {
                    $validator->errors()->add('categoria_id', 'A categoria selecionada é inválida.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'descricao.required'    => 'A descrição é obrigatória.',
            'valor.required'        => 'Informe o valor do lançamento.',
            'valor.gt'              => 'O valor deve ser maior que zero.',
            'data.required'         => 'Informe a data do lançamento.',
            'data.date'             => 'Informe uma data válida.',
            'categoria_id.required' => 'Selecione uma categoria.',
        ];
    }
}
