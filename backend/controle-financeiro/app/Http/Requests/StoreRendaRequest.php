<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Registro de renda de uma competência.
 *
 * A competência chega como 'YYYY-MM' e é sempre normalizada para o dia 1.
 * Quando omitida, assume o mês corrente — comportamento compatível com o
 * formulário atual do frontend, que envia apenas o valor.
 */
class StoreRendaRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->filled('competencia')) {
            $this->merge(['competencia' => now()->format('Y-m')]);
        }
    }

    public function rules(): array
    {
        return [
            'valor'       => ['required', 'numeric', 'gte:0', 'max:99999999.99'],
            'competencia' => ['required', 'date_format:Y-m'],
            'descricao'   => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'valor.required'            => 'Informe o valor da renda.',
            'valor.numeric'             => 'O valor deve ser um número.',
            'valor.gte'                 => 'O valor não pode ser negativo.',
            'competencia.date_format'   => 'A competência deve estar no formato AAAA-MM.',
        ];
    }
}
