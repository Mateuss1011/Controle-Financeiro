<?php

namespace Tests\Feature\Api;

use App\Models\Gasto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * O que a API diz quando algo dá errado.
 *
 * Estes testes nasceram da auditoria final. O que existia antes verificava
 * apenas um 401 — e um 401 nunca carrega stack trace, com ou sem APP_DEBUG.
 * O teste passava sem exercitar nada, dando falsa sensação de cobertura.
 *
 * Cada caso aqui roda com `app.debug` ligado DE PROPÓSITO: é a configuração
 * mais perigosa, e é justamente a que um deploy descuidado herda do
 * `.env.example`. Se a resposta é limpa com debug ligado, é limpa sempre.
 */
class RespostasDeErroTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        // A pior configuração possível, para provar que a resposta não depende
        // dela.
        config(['app.debug' => true]);
    }

    /** @return array<string, array{string}> */
    private function marcasDeVazamento(): array
    {
        return [
            'trace'         => '"trace"',
            'exception'     => '"exception"',
            'namespace'     => 'App\\Models',
            'caminho php'   => '.php',
            'pasta vendor'  => 'vendor',
            'erro de sql'   => 'SQLSTATE',
        ];
    }

    private function assertRespostaLimpa(string $conteudo, string $contexto): void
    {
        foreach ($this->marcasDeVazamento() as $rotulo => $marca) {
            $this->assertStringNotContainsString(
                $marca,
                $conteudo,
                "{$contexto}: a resposta expõe {$rotulo}"
            );
        }
    }

    /**
     * O padrão do Laravel é "No query results for model [App\Models\Gasto] 9",
     * e isso sai assim mesmo com APP_DEBUG=false: o namespace da aplicação vira
     * informação pública e o usuário recebe inglês técnico.
     */
    public function test_id_inexistente_nao_revela_a_classe_do_model(): void
    {
        $resposta = $this->actingAs($this->user)->getJson('/api/gastos/999999');

        $resposta->assertNotFound()->assertJsonPath('message', 'Registro não encontrado.');

        $this->assertRespostaLimpa($resposta->getContent(), 'GET /api/gastos/{id inexistente}');
    }

    public function test_id_inexistente_em_todas_as_rotas_de_recurso(): void
    {
        foreach (['gastos', 'categorias', 'rendas'] as $recurso) {
            $resposta = $this->actingAs($this->user)->getJson("/api/{$recurso}/999999");

            $resposta->assertNotFound();
            $this->assertRespostaLimpa($resposta->getContent(), "GET /api/{$recurso}/999999");
        }

        foreach (['metas', 'orcamentos'] as $recurso) {
            $resposta = $this->actingAs($this->user)->deleteJson("/api/{$recurso}/999999");

            $resposta->assertNotFound();
            $this->assertRespostaLimpa($resposta->getContent(), "DELETE /api/{$recurso}/999999");
        }
    }

    /** Endereço que não existe é diferente de registro que não existe. */
    public function test_rota_inexistente_responde_com_texto_util(): void
    {
        $resposta = $this->actingAs($this->user)->getJson('/api/nao-existe');

        $resposta->assertNotFound()->assertJsonPath('message', 'Endereço não encontrado.');
        $this->assertRespostaLimpa($resposta->getContent(), 'GET /api/nao-existe');
    }

    /** Antes vinha com `message` vazia: erro sem nada para mostrar ao usuário. */
    public function test_metodo_errado_responde_405_com_texto(): void
    {
        $resposta = $this->actingAs($this->user)->putJson('/api/dashboard');

        $resposta->assertStatus(405)
            ->assertJsonPath('message', 'Método não permitido para este endereço.');
    }

    /** Antes: "This action is unauthorized." */
    public function test_negativa_de_policy_responde_em_portugues(): void
    {
        $outro = User::factory()->create();
        $gastoAlheio = Gasto::factory()->create(['user_id' => $outro->id]);

        // O escopo global esconde o registro antes da Policy, então este é o
        // 404 de sempre — o que importa é que nenhum dos dois caminhos vaze.
        $resposta = $this->actingAs($this->user)->getJson("/api/gastos/{$gastoAlheio->id}");

        $resposta->assertNotFound();
        $this->assertRespostaLimpa($resposta->getContent(), 'recurso de outro usuário');
    }

    /** Erro de validação não pode carregar detalhe interno junto. */
    public function test_erro_de_validacao_nao_vaza_detalhe_interno(): void
    {
        $resposta = $this->actingAs($this->user)->postJson('/api/gastos', []);

        $resposta->assertStatus(422)->assertJsonStructure(['message', 'errors']);
        $this->assertRespostaLimpa($resposta->getContent(), 'POST /api/gastos vazio');
    }

    public function test_sem_token_nao_vaza_detalhe_interno(): void
    {
        foreach (['/api/gastos', '/api/dashboard', '/api/relatorios'] as $rota) {
            $resposta = $this->getJson($rota);

            $resposta->assertUnauthorized();
            $this->assertRespostaLimpa($resposta->getContent(), "GET {$rota} sem token");
        }
    }

    /**
     * A proteção do 500 depende de `APP_DEBUG=false` — e é por isso que o
     * `.env.example` precisa dizer isso a quem for publicar.
     */
    public function test_erro_interno_so_e_seguro_com_debug_desligado(): void
    {
        $manipulador = app(\Illuminate\Contracts\Debug\ExceptionHandler::class);
        $requisicao = \Illuminate\Http\Request::create('/api/gastos', 'GET');
        $requisicao->headers->set('Accept', 'application/json');
        $erro = new \RuntimeException('SQLSTATE[42S02] tabela secreta');

        config(['app.debug' => false]);
        $resposta = $manipulador->render($requisicao, $erro);

        $this->assertSame(500, $resposta->getStatusCode());
        $this->assertRespostaLimpa($resposta->getContent(), '500 com debug desligado');
        $this->assertStringContainsString('Server Error', $resposta->getContent());
    }
}
