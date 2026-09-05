<?php

namespace App\Http\Controllers;

use App\Http\Requests\AtualizarSenhaRequest;
use App\Http\Requests\UpdatePerfilRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * A própria conta: nome, e-mail e senha.
 *
 * Não há rota que liste ou alcance outro usuário — o alvo é sempre
 * `$request->user()`, resolvido pelo token. Isso torna impossível, por
 * construção, editar o perfil alheio manipulando um id na URL.
 */
class PerfilController extends Controller
{
    public function update(UpdatePerfilRequest $request): UserResource
    {
        $usuario = $request->user();
        // `dadosDoPerfil()` e não `validated()`: `senha_atual` é prova de
        // identidade, não coluna de `users`.
        $usuario->update($request->dadosDoPerfil());

        return new UserResource($usuario->fresh());
    }

    /**
     * Troca de senha.
     *
     * Todos os outros tokens são revogados: se a troca aconteceu porque a senha
     * vazou, deixar as sessões antigas de pé anularia o motivo da troca. O token
     * desta sessão sobrevive — deslogar quem acabou de se autenticar para trocar
     * a senha seria punir o acerto.
     */
    public function atualizarSenha(AtualizarSenhaRequest $request): JsonResponse
    {
        $usuario = $request->user();

        $usuario->forceFill([
            'password' => Hash::make($request->validated('senha')),
        ])->save();

        // `currentAccessToken()` nem sempre é um token gravado: autenticação por
        // sessão devolve um TransientToken, que não tem id. Ler `->id` dele
        // derrubava a rota com 500 em vez de trocar a senha.
        $atual = $request->user()->currentAccessToken();
        $idAtual = $atual instanceof PersonalAccessToken ? $atual->getKey() : null;

        $encerradas = $usuario->tokens()
            ->when($idAtual, fn ($query) => $query->where('id', '!=', $idAtual))
            ->delete();

        return response()->json([
            'message'           => 'Senha alterada com sucesso.',
            'sessoes_encerradas' => $encerradas,
        ]);
    }
}
