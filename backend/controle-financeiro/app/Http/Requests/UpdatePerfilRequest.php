<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Edição do próprio perfil.
 *
 * O e-mail é a CREDENCIAL DE LOGIN. Trocá-lo muda como a pessoa entra na conta,
 * então exige a senha atual: sem isso, um computador deixado desbloqueado ou um
 * token roubado bastariam para tomar a conta — trocar o e-mail e pedir
 * recuperação de senha é o caminho mais curto entre acesso temporário e
 * sequestro permanente.
 *
 * A senha é exigida só quando o e-mail REALMENTE MUDA, comparado contra o que
 * está gravado. A distinção não é preciosismo: o formulário envia nome e e-mail
 * juntos a cada salvamento, então uma regra do tipo "campo e-mail presente ⇒
 * peça a senha" faria a troca de nome pedir senha também.
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
            'senha_atual' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /** O e-mail enviado é diferente do que está gravado? */
    public function trocaDeEmail(): bool
    {
        if (! $this->has('email')) {
            return false;
        }

        $novo = $this->input('email');

        return is_string($novo) && trim($novo) !== $this->user()->email;
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! $this->trocaDeEmail()) {
                    return;
                }

                // Um e-mail já inválido ou duplicado não chega a ser uma troca:
                // pedir a senha aqui só empilharia erros.
                if ($validator->errors()->has('email')) {
                    return;
                }

                $senha = $this->input('senha_atual');

                if (! is_string($senha) || $senha === '') {
                    $validator->errors()->add(
                        'senha_atual',
                        'Informe sua senha atual para alterar o e-mail.'
                    );

                    return;
                }

                if (! Hash::check($senha, $this->user()->password)) {
                    $validator->errors()->add('senha_atual', 'A senha atual está incorreta.');
                }
            },
        ];
    }

    /**
     * Só os campos que são coluna.
     *
     * `senha_atual` é prova de identidade, não dado de perfil — e `validated()`
     * alimenta o `update()` do model direto.
     *
     * @return array<string, mixed>
     */
    public function dadosDoPerfil(): array
    {
        return collect($this->validated())
            ->only(['name', 'email'])
            ->all();
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
