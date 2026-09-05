<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Criação de uma meta.
 *
 * `prazo` é opcional: "juntar R$ 10.000" é uma meta legítima sem data. O que
 * não é legítimo é objetivo zero ou negativo — viraria divisão por zero no
 * percentual — nem acumulado maior que o objetivo.
 */
class StoreMetaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nome'           => ['required', 'string', 'max:120'],
            'valor_objetivo' => ['required', 'numeric', 'gt:0', 'max:999999999.99'],
            'valor_atual'    => ['nullable', 'numeric', 'gte:0', 'max:999999999.99'],
            'prazo'          => ['nullable', 'date_format:Y-m-d'],
        ];
    }

    /**
     * O acumulado não pode passar do objetivo: uma meta "115% concluída" não
     * significa nada e produziria percentual e restante incoerentes.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $atual = $this->input('valor_atual');
                $objetivo = $this->input('valor_objetivo');

                if ($atual === null || ! is_numeric($atual) || ! is_numeric($objetivo)) {
                    return;
                }

                if ((float) $atual > (float) $objetivo) {
                    $validator->errors()->add(
                        'valor_atual',
                        'O valor já guardado não pode ser maior que o objetivo.'
                    );
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required'           => 'Dê um nome para a meta.',
            'nome.max'                => 'O nome deve ter no máximo 120 caracteres.',
            'valor_objetivo.required' => 'Informe quanto você quer juntar.',
            'valor_objetivo.numeric'  => 'O objetivo deve ser um número.',
            'valor_objetivo.gt'       => 'O objetivo deve ser maior que zero.',
            'valor_objetivo.max'      => 'O objetivo informado é alto demais.',
            'valor_atual.numeric'     => 'O valor já guardado deve ser um número.',
            'valor_atual.gte'         => 'O valor já guardado não pode ser negativo.',
            'prazo.date_format'       => 'A data deve estar no formato AAAA-MM-DD.',
        ];
    }
}
