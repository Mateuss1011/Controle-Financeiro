<?php

namespace App\Http\Requests;

use App\Models\Categoria;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Definição do limite de uma categoria.
 *
 * `competencia` ausente ou nula grava o orçamento recorrente, que vale para
 * todo mês sem exceção definida.
 */
class StoreOrcamentoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'categoria_id' => ['required', 'integer'],
            'valor_limite' => ['required', 'numeric', 'gt:0', 'max:99999999.99'],
            'competencia'  => ['nullable', 'date_format:Y-m'],
        ];
    }

    /**
     * A categoria precisa ser visível para quem pede — global ou do próprio
     * usuário. `exists:categorias,id` deixaria orçar a categoria privada de
     * outra pessoa.
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
            'categoria_id.required'   => 'Selecione uma categoria.',
            'valor_limite.required'   => 'Informe o limite do orçamento.',
            'valor_limite.numeric'    => 'O limite deve ser um número.',
            'valor_limite.gt'         => 'O limite deve ser maior que zero.',
            'competencia.date_format' => 'A competência deve estar no formato AAAA-MM.',
        ];
    }
}
