<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

/**
 * Troca de senha.
 *
 * A senha atual é exigida mesmo com a sessão já autenticada: um token roubado
 * ou um computador deixado aberto não pode virar troca de senha — que é o que
 * transforma um acesso temporário num sequestro permanente da conta.
 *
 * A mensagem de senha atual incorreta é específica de propósito, ao contrário
 * da do login: aqui já sabemos quem é o usuário, e "credenciais inválidas" só
 * confundiria quem digitou errado.
 */
class AtualizarSenhaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'senha_atual' => ['required', 'string'],
            'senha'       => ['required', 'confirmed', Password::min(8)],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->has('senha_atual')) {
                    return;
                }

                if (! Hash::check($this->input('senha_atual'), $this->user()->password)) {
                    $validator->errors()->add('senha_atual', 'A senha atual está incorreta.');

                    return;
                }

                // Trocar uma senha por ela mesma dá a falsa impressão de que as
                // outras sessões foram encerradas.
                if ($this->input('senha') === $this->input('senha_atual')) {
                    $validator->errors()->add('senha', 'A nova senha precisa ser diferente da atual.');
                }
            },
        ];
    }

    public function messages(): array
    {
        return [
            'senha_atual.required' => 'Informe sua senha atual.',
            'senha.required'       => 'Informe a nova senha.',
            'senha.confirmed'      => 'A confirmação não confere com a nova senha.',
            'senha.min'            => 'A nova senha deve ter no mínimo 8 caracteres.',
        ];
    }
}
