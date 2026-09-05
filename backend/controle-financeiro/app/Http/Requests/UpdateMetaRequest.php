<?php

namespace App\Http\Requests;

use App\Models\Meta;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Edição de uma meta, incluindo o aporte rápido (só `valor_atual`).
 *
 * `prazo` aceita nulo de propósito: uma meta pode deixar de ter data. O campo
 * vazio do formulário chega como null pelo ConvertEmptyStringsToNull.
 */
class UpdateMetaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nome'           => ['sometimes', 'required', 'string', 'max:120'],
            'valor_objetivo' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:999999999.99'],
            'valor_atual'    => ['sometimes', 'required', 'numeric', 'gte:0', 'max:999999999.99'],
            'prazo'          => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }

    /**
     * Mesma coerência da criação, mas o objetivo pode não vir no payload — nesse
     * caso compara-se com o que já está gravado.
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! $this->has('valor_atual')) {
                    return;
                }

                $meta = $this->route('meta');
                $objetivo = $this->input(
                    'valor_objetivo',
                    $meta instanceof Meta ? $meta->valor_objetivo : null,
                );
                $atual = $this->input('valor_atual');

                if (! is_numeric($atual) || ! is_numeric($objetivo)) {
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
            'valor_objetivo.gt'       => 'O objetivo deve ser maior que zero.',
            'valor_atual.required'    => 'Informe o valor já guardado.',
            'valor_atual.numeric'     => 'O valor já guardado deve ser um número.',
            'valor_atual.gte'         => 'O valor já guardado não pode ser negativo.',
            'prazo.date_format'       => 'A data deve estar no formato AAAA-MM-DD.',
        ];
    }
}
