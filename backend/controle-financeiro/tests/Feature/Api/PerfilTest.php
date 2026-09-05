<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PerfilTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'name'     => 'Maria Silva',
            'email'    => 'maria@exemplo.com',
            'password' => Hash::make('SenhaAtual#2026'),
        ]);
    }

    // ---------------------------------------------------------------- perfil

    public function test_atualiza_nome_e_email(): void
    {
        $this->actingAs($this->user)
            ->patchJson('/api/perfil', [
                'name'  => 'Maria Silva Souza',
                'email' => 'maria.souza@exemplo.com',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Maria Silva Souza')
            ->assertJsonPath('data.email', 'maria.souza@exemplo.com');

        $this->assertDatabaseHas('users', [
            'id'    => $this->user->id,
            'name'  => 'Maria Silva Souza',
            'email' => 'maria.souza@exemplo.com',
        ]);
    }

    public function test_atualiza_apenas_o_nome_sem_mexer_no_email(): void
    {
        $this->actingAs($this->user)
            ->patchJson('/api/perfil', ['name' => 'Maria S.'])
            ->assertOk()
            ->assertJsonPath('data.email', 'maria@exemplo.com');
    }

    /** Manter o próprio e-mail não pode colidir consigo mesmo. */
    public function test_aceita_o_proprio_email_sem_reclamar_de_duplicidade(): void
    {
        $this->actingAs($this->user)
            ->patchJson('/api/perfil', ['email' => 'maria@exemplo.com'])
            ->assertOk();
    }

    public function test_rejeita_email_de_outro_usuario(): void
    {
        User::factory()->create(['email' => 'joao@exemplo.com']);

        $this->actingAs($this->user)
            ->patchJson('/api/perfil', ['email' => 'joao@exemplo.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_rejeita_nome_vazio_e_email_invalido(): void
    {
        $this->actingAs($this->user)
            ->patchJson('/api/perfil', ['name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->actingAs($this->user)
            ->patchJson('/api/perfil', ['email' => 'nao-e-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    /** A resposta do perfil nunca pode carregar o hash da senha. */
    public function test_resposta_nao_expoe_a_senha(): void
    {
        $conteudo = $this->actingAs($this->user)
            ->patchJson('/api/perfil', ['name' => 'Maria'])
            ->assertOk()
            ->getContent();

        $this->assertStringNotContainsString('password', $conteudo);
        $this->assertStringNotContainsString('$2y$', $conteudo);
    }

    // ----------------------------------------------------------------- senha

    public function test_troca_a_senha_com_a_senha_atual_correta(): void
    {
        $this->actingAs($this->user)
            ->putJson('/api/perfil/senha', [
                'senha_atual'           => 'SenhaAtual#2026',
                'senha'                 => 'NovaSenha#2026',
                'senha_confirmation'    => 'NovaSenha#2026',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Senha alterada com sucesso.');

        $this->assertTrue(Hash::check('NovaSenha#2026', $this->user->fresh()->password));
    }

    /**
     * Sessão autenticada não basta: um token roubado não pode virar troca de
     * senha, que é o que transforma acesso temporário em sequestro da conta.
     */
    public function test_recusa_a_troca_sem_a_senha_atual_correta(): void
    {
        $this->actingAs($this->user)
            ->putJson('/api/perfil/senha', [
                'senha_atual'        => 'ChutandoAqui#1',
                'senha'              => 'NovaSenha#2026',
                'senha_confirmation' => 'NovaSenha#2026',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('senha_atual');

        $this->assertTrue(Hash::check('SenhaAtual#2026', $this->user->fresh()->password));
    }

    public function test_exige_confirmacao_e_tamanho_minimo(): void
    {
        $this->actingAs($this->user)
            ->putJson('/api/perfil/senha', [
                'senha_atual'        => 'SenhaAtual#2026',
                'senha'              => 'NovaSenha#2026',
                'senha_confirmation' => 'OutraCoisa#2026',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('senha');

        $this->actingAs($this->user)
            ->putJson('/api/perfil/senha', [
                'senha_atual'        => 'SenhaAtual#2026',
                'senha'              => 'curta',
                'senha_confirmation' => 'curta',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('senha');
    }

    /** Trocar a senha por ela mesma daria a falsa impressão de ter encerrado sessões. */
    public function test_recusa_a_nova_senha_igual_a_atual(): void
    {
        $this->actingAs($this->user)
            ->putJson('/api/perfil/senha', [
                'senha_atual'        => 'SenhaAtual#2026',
                'senha'              => 'SenhaAtual#2026',
                'senha_confirmation' => 'SenhaAtual#2026',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('senha');
    }

    /**
     * Se a troca aconteceu porque a senha vazou, deixar as sessões antigas de pé
     * anularia o motivo da troca.
     */
    public function test_troca_de_senha_encerra_as_outras_sessoes_e_mantem_a_atual(): void
    {
        $outroDispositivo = $this->user->createToken('celular')->plainTextToken;
        $estaSessao = $this->user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$estaSessao}")
            ->putJson('/api/perfil/senha', [
                'senha_atual'        => 'SenhaAtual#2026',
                'senha'              => 'NovaSenha#2026',
                'senha_confirmation' => 'NovaSenha#2026',
            ])
            ->assertOk()
            ->assertJsonPath('sessoes_encerradas', 1);

        // O guard mantem o usuario resolvido em cache dentro do mesmo teste;
        // sem esquece-lo, a requisicao seguinte responde 200 com o token ja
        // apagado e o teste mede o cache, nao a autenticacao.
        $this->app['auth']->forgetGuards();

        // O token do outro dispositivo morreu...
        $this->withHeader('Authorization', "Bearer {$outroDispositivo}")
            ->getJson('/api/me')
            ->assertUnauthorized();

        $this->app['auth']->forgetGuards();

        // ...e o desta sessão continua valendo.
        $this->withHeader('Authorization', "Bearer {$estaSessao}")
            ->getJson('/api/me')
            ->assertOk();
    }

    public function test_login_passa_a_exigir_a_nova_senha(): void
    {
        $this->actingAs($this->user)->putJson('/api/perfil/senha', [
            'senha_atual'        => 'SenhaAtual#2026',
            'senha'              => 'NovaSenha#2026',
            'senha_confirmation' => 'NovaSenha#2026',
        ])->assertOk();

        $this->postJson('/api/login', [
            'email'    => 'maria@exemplo.com',
            'password' => 'SenhaAtual#2026',
        ])->assertUnauthorized();

        $this->postJson('/api/login', [
            'email'    => 'maria@exemplo.com',
            'password' => 'NovaSenha#2026',
        ])->assertOk();
    }

    // ------------------------------------------------------------ isolamento

    public function test_rotas_de_perfil_exigem_autenticacao(): void
    {
        $this->patchJson('/api/perfil', ['name' => 'Invasor'])->assertUnauthorized();
        $this->putJson('/api/perfil/senha', [])->assertUnauthorized();
    }

    /**
     * Não existe rota que alcance outro usuário: o alvo é sempre o dono do
     * token. Este teste registra a ausência de superfície, não um bloqueio.
     */
    public function test_alteracao_atinge_apenas_o_dono_do_token(): void
    {
        $outro = User::factory()->create(['name' => 'João', 'email' => 'joao@exemplo.com']);

        $this->actingAs($this->user)
            ->patchJson('/api/perfil', ['name' => 'Alterado'])
            ->assertOk();

        $this->assertSame('João', $outro->fresh()->name);
        $this->assertSame('Alterado', $this->user->fresh()->name);
    }
}
