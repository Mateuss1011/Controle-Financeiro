<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * A conta pública de demonstração não muda de dono.
 *
 * As rotas de perfil provam identidade pedindo a senha atual — e a senha atual
 * da conta de demonstração está publicada no README. Sem trava, o primeiro
 * visitante que quisesse trocaria o e-mail e a senha, e a demonstração ficaria
 * inacessível para todo mundo, inclusive para quem a criou.
 *
 * Não é isolamento entre usuários: isso o escopo global já garante, e
 * `IsolamentoEntreUsuariosTest` já prova. É a porta da frente da casa, aberta
 * de propósito, que não pode ter a fechadura trocada.
 */
class ContaDeDemonstracaoTest extends TestCase
{
    use RefreshDatabase;

    private const EMAIL_DEMO = 'demo@controlefinanceiro.local';

    private function contaDemo(): User
    {
        config(['app.conta_demo' => self::EMAIL_DEMO]);

        return User::factory()->create([
            'email'    => self::EMAIL_DEMO,
            'password' => Hash::make('Demo@123456'),
        ]);
    }

    public function test_a_conta_de_demonstracao_nao_troca_a_propria_senha(): void
    {
        $demo = $this->contaDemo();

        $this->actingAs($demo)
            ->putJson('/api/perfil/senha', [
                'senha_atual'           => 'Demo@123456',
                'senha'                 => 'SenhaDoInvasor1!',
                'senha_confirmation'    => 'SenhaDoInvasor1!',
            ])
            ->assertForbidden();

        // A senha publicada continua valendo: a demonstração segue de pé.
        $this->assertTrue(Hash::check('Demo@123456', $demo->fresh()->password));
    }

    public function test_a_conta_de_demonstracao_nao_troca_o_proprio_email(): void
    {
        $demo = $this->contaDemo();

        $this->actingAs($demo)
            ->patchJson('/api/perfil', [
                'name'        => 'Sequestrada',
                'email'       => 'invasor@exemplo.com',
                'senha_atual' => 'Demo@123456',
            ])
            ->assertForbidden();

        $this->assertSame(self::EMAIL_DEMO, $demo->fresh()->email);
    }

    /** A recusa explica o caminho em vez de só negar. */
    public function test_a_recusa_diz_o_que_fazer(): void
    {
        $demo = $this->contaDemo();

        $this->actingAs($demo)
            ->patchJson('/api/perfil', [
                'name'        => 'Qualquer',
                'senha_atual' => 'Demo@123456',
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'A conta de demonstração é pública e não pode ser alterada. Crie a sua para editar o perfil.');
    }

    /**
     * A trava é cirúrgica: vale para uma conta só, a configurada. Qualquer
     * outra continua editando o próprio perfil como sempre.
     */
    public function test_usuario_comum_continua_editando_o_proprio_perfil(): void
    {
        config(['app.conta_demo' => self::EMAIL_DEMO]);

        $pessoa = User::factory()->create([
            'email'    => 'pessoa@exemplo.com',
            'password' => Hash::make('SenhaForte1!'),
        ]);

        $this->actingAs($pessoa)
            ->patchJson('/api/perfil', [
                'name'        => 'Nome Novo',
                'senha_atual' => 'SenhaForte1!',
            ])
            ->assertOk();

        $this->assertSame('Nome Novo', $pessoa->fresh()->name);
    }

    /**
     * Sem `DEMO_EMAIL` configurado — desenvolvimento, testes, qualquer
     * instalação privada — nenhuma conta é tratada como demonstração e o
     * produto se comporta exatamente como antes.
     */
    public function test_sem_conta_demo_configurada_ninguem_e_tratado_como_demo(): void
    {
        config(['app.conta_demo' => null]);

        $usuario = User::factory()->create([
            'email'    => self::EMAIL_DEMO,
            'password' => Hash::make('Demo@123456'),
        ]);

        $this->assertFalse($usuario->ehContaDeDemonstracao());

        $this->actingAs($usuario)
            ->patchJson('/api/perfil', [
                'name'        => 'Pode Mudar',
                'senha_atual' => 'Demo@123456',
            ])
            ->assertOk();
    }
}
