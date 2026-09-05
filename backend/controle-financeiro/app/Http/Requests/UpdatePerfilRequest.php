<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Edição do próprio perfil.
 *
 * O e-mail é a credencial de login, então mudá-lo muda como a pessoa entra na
 * conta. Ele continua editável — mas a unicidade ignora o próprio usuário, e a
 * interface avisa o que a troca significa.
 */
class UpdatePerfilRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'  => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->user()->id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'  => 'Informe seu nome.',
            'name.max'       => 'O nome deve ter no máximo 255 caracteres.',
            'email.required' => 'Informe seu e-mail.',
            'email.email'    => 'Informe um e-mail válido.',
            'email.unique'   => 'Este e-mail já está em uso.',
        ];
    }
}
