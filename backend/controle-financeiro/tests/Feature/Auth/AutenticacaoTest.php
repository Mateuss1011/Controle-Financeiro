<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AutenticacaoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Os limiters compartilham o cache entre testes; sem isso o 6º request
        // de qualquer teste da classe já cairia em 429.
        RateLimiter::clear('autenticacao');
    }

    public function test_registro_cria_usuario_e_devolve_token(): void
    {
        $resposta = $this->postJson('/api/register', [
            'name'                  => 'Mateus',
            'email'                 => 'novo@exemplo.com',
            'password'              => 'senhaforte1',
            'password_confirmation' => 'senhaforte1',
        ]);

        $resposta->assertCreated()
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);

        $this->assertDatabaseHas('users', ['email' => 'novo@exemplo.com']);
    }

    public function test_registro_nunca_devolve_a_senha(): void
    {
        $resposta = $this->postJson('/api/register', [
            'name'                  => 'Mateus',
            'email'                 => 'novo@exemplo.com',
            'password'              => 'senhaforte1',
            'password_confirmation' => 'senhaforte1',
        ]);

        $resposta->assertJsonMissingPath('user.password');
    }

    public function test_registro_recusa_email_duplicado(): void
    {
        User::factory()->create(['email' => 'usado@exemplo.com']);

        $this->postJson('/api/register', [
            'name'                  => 'Outro',
            'email'                 => 'usado@exemplo.com',
            'password'              => 'senhaforte1',
            'password_confirmation' => 'senhaforte1',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_registro_recusa_senha_fraca(): void
    {
        $this->postJson('/api/register', [
            'name'                  => 'Mateus',
            'email'                 => 'novo@exemplo.com',
            'password'              => '123',
            'password_confirmation' => '123',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_login_com_credenciais_corretas_devolve_token(): void
    {
        User::factory()->create([
            'email'    => 'mateus@exemplo.com',
            'password' => Hash::make('senhaforte1'),
        ]);

        $this->postJson('/api/login', [
            'email'    => 'mateus@exemplo.com',
            'password' => 'senhaforte1',
        ])->assertOk()->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token']);
    }

    public function test_login_com_senha_errada_devolve_401(): void
    {
        User::factory()->create([
            'email'    => 'mateus@exemplo.com',
            'password' => Hash::make('senhaforte1'),
        ]);

        $this->postJson('/api/login', [
            'email'    => 'mateus@exemplo.com',
            'password' => 'errada',
        ])->assertStatus(401)->assertJson(['message' => 'Credenciais inválidas.']);
    }

    public function test_login_com_email_inexistente_devolve_a_mesma_mensagem(): void
    {
        $this->postJson('/api/login', [
            'email'    => 'naoexiste@exemplo.com',
            'password' => 'qualquer',
        ])->assertStatus(401)->assertJson(['message' => 'Credenciais inválidas.']);
    }

    public function test_login_tem_rate_limit(): void
    {
        User::factory()->create(['email' => 'alvo@exemplo.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email'    => 'alvo@exemplo.com',
                'password' => 'tentativa' . $i,
            ])->assertStatus(401);
        }

        $this->postJson('/api/login', [
            'email'    => 'alvo@exemplo.com',
            'password' => 'maisuma',
        ])->assertStatus(429);
    }

    public function test_logout_revoga_o_token_usado(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/logout')
            ->assertOk();

        // O guard fica resolvido no container entre requests do mesmo teste.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/gastos')
            ->assertStatus(401);
    }

    public function test_me_devolve_o_usuario_autenticado(): void
    {
        $user = User::factory()->create(['name' => 'Mateus']);

        $this->actingAs($user)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.name', 'Mateus');
    }
}
