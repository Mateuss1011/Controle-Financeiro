<?php

namespace App\Http\Controllers;

use App\Http\Requests\AtualizarSenhaRequest;
use App\Http\Requests\UpdatePerfilRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
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
    /**
     * A conta pública de demonstração não muda de dono.
     *
     * As duas rotas abaixo provam identidade pedindo a senha atual — e a senha
     * atual da conta de demonstração está publicada no README. Sem esta trava,
     * o primeiro visitante que quisesse trocaria o e-mail e a senha, e a
     * demonstração ficaria inacessível para todo mundo, inclusive para quem a
     * criou. Não é vazamento de dado de ninguém: é a porta da frente da casa
     * que está aberta de propósito e não pode ter a fechadura trocada.
     *
     * Fora do ambiente público, `app.conta_demo` é nulo e nada disto existe.
     */
    private function recusarSeForDemonstracao(?User $usuario): void
    {
        abort_if(
            $usuario?->ehContaDeDemonstracao() ?? false,
            403,
            'A conta de demonstração é pública e não pode ser alterada. Crie a sua para editar o perfil.'
        );
    }

    public function update(UpdatePerfilRequest $request): UserResource
    {
        $usuario = $request->user();

        $this->recusarSeForDemonstracao($usuario);

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

        $this->recusarSeForDemonstracao($usuario);

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
