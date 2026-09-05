<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Orcamento;
use App\Models\Salario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class OrcamentoTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Categoria $alimentacao;
    private Categoria $lazer;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-09-15 12:00:00');

        $this->user = User::factory()->create();

        $this->alimentacao = Categoria::factory()
            ->doTipo(TipoCategoria::Necessidade)
            ->create(['user_id' => null, 'nome' => 'Alimentação']);

        $this->lazer = Categoria::factory()
            ->doTipo(TipoCategoria::Desejo)
            ->create(['user_id' => null, 'nome' => 'Lazer']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function gasto(Categoria $categoria, float $valor, string $data = '2026-09-05'): Gasto
    {
        return Gasto::factory()->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $categoria->id,
            'valor'        => $valor,
            'data'         => $data,
        ]);
    }

    private function listar(?string $competencia = null): array
    {
        $url = '/api/orcamentos' . ($competencia ? "?competencia={$competencia}" : '');

        return $this->actingAs($this->user)->getJson($url)->assertOk()->json();
    }

    // ------------------------------------------------------------- estrutura

    public function test_exige_autenticacao(): void
    {
        $this->getJson('/api/orcamentos')->assertStatus(401);
        $this->postJson('/api/orcamentos')->assertStatus(401);
        $this->deleteJson('/api/orcamentos/1')->assertStatus(401);
    }

    public function test_lista_vazia_quando_nao_ha_orcamento(): void
    {
        $resposta = $this->listar();

        $this->assertSame([], $resposta['data']);
        $this->assertSame(0, $resposta['resumo']['quantidade']);
        $this->assertSame(0.0, (float) $resposta['resumo']['limite']);
    }

    // ------------------------------------------------------------- criação

    public function test_cria_orcamento_recorrente(): void
    {
        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $this->alimentacao->id,
            'valor_limite' => 800,
        ])->assertCreated()
            ->assertJsonPath('data.recorrente', true)
            ->assertJsonPath('data.competencia', null)
            ->assertJsonPath('data.valor_limite', fn ($v) => (float) $v === 800.0);

        $this->assertDatabaseHas('orcamentos', [
            'user_id'      => $this->user->id,
            'categoria_id' => $this->alimentacao->id,
            'competencia'  => null,
        ]);
    }

    public function test_cria_orcamento_de_uma_competencia_especifica(): void
    {
        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $this->alimentacao->id,
            'valor_limite' => 1200,
            'competencia'  => '2026-12',
        ])->assertCreated()
            ->assertJsonPath('data.recorrente', false)
            ->assertJsonPath('data.competencia', '2026-12');
    }

    /** Uma categoria tem no máximo um orçamento por competência. */
    public function test_registrar_de_novo_a_mesma_categoria_atualiza_em_vez_de_duplicar(): void
    {
        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $this->alimentacao->id, 'valor_limite' => 800,
        ])->assertCreated();

        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $this->alimentacao->id, 'valor_limite' => 950,
        ])->assertOk()->assertJsonPath('data.valor_limite', fn ($v) => (float) $v === 950.0);

        $this->assertSame(1, Orcamento::withoutGlobalScopes()
            ->where('user_id', $this->user->id)
            ->count());
    }

    public function test_recorrente_e_especifico_da_mesma_categoria_coexistem(): void
    {
        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $this->alimentacao->id, 'valor_limite' => 800,
        ])->assertCreated();

        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $this->alimentacao->id, 'valor_limite' => 1200, 'competencia' => '2026-12',
        ])->assertCreated();

        $this->assertSame(2, Orcamento::withoutGlobalScopes()
            ->where('user_id', $this->user->id)
            ->count());
    }

    // ------------------------------------------------------------ validação

    public function test_recusa_limite_zerado_ou_negativo(): void
    {
        foreach ([0, -100] as $valor) {
            $this->actingAs($this->user)->postJson('/api/orcamentos', [
                'categoria_id' => $this->alimentacao->id, 'valor_limite' => $valor,
            ])->assertStatus(422)->assertJsonValidationErrors('valor_limite');
        }
    }

    public function test_recusa_categoria_inexistente(): void
    {
        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => 99999, 'valor_limite' => 500,
        ])->assertStatus(422)->assertJsonValidationErrors('categoria_id');
    }

    public function test_recusa_categoria_privada_de_outro_usuario(): void
    {
        $outro = User::factory()->create();
        $privada = Categoria::factory()->create(['user_id' => $outro->id]);

        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $privada->id, 'valor_limite' => 500,
        ])->assertStatus(422)->assertJsonValidationErrors('categoria_id');
    }

    public function test_recusa_competencia_em_formato_invalido(): void
    {
        $this->actingAs($this->user)->postJson('/api/orcamentos', [
            'categoria_id' => $this->alimentacao->id, 'valor_limite' => 500, 'competencia' => '12/2026',
        ])->assertStatus(422)->assertJsonValidationErrors('competencia');
    }

    // --------------------------------------------------------- confrontação

    public function test_confronta_limite_com_o_gasto_real_da_competencia(): void
    {
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 800,
        ]);

        $this->gasto($this->alimentacao, 500);
        $this->gasto($this->alimentacao, 100);
        // Outro mês: não pode entrar na conta.
        $this->gasto($this->alimentacao, 900, '2026-08-05');

        $item = $this->listar('2026-09')['data'][0];

        $this->assertSame(800.0, (float) $item['limite']);
        $this->assertSame(600.0, (float) $item['gasto']);
        $this->assertSame(200.0, (float) $item['restante']);
        $this->assertSame(75.0, (float) $item['percentual']);
        $this->assertSame('normal', $item['status']);
    }

    public function test_status_percorre_normal_atencao_e_estourado(): void
    {
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->lazer->id, 'valor_limite' => 100,
        ]);

        $this->assertSame('normal', $this->listar('2026-09')['data'][0]['status']);

        // 80% é o limiar de atenção.
        $this->gasto($this->lazer, 85);
        $this->assertSame('atencao', $this->listar('2026-09')['data'][0]['status']);

        $this->gasto($this->lazer, 30);
        $item = $this->listar('2026-09')['data'][0];
        $this->assertSame('estourado', $item['status']);
        $this->assertSame(-15.0, (float) $item['restante']);
    }

    /** O orçamento do mês vence o recorrente da mesma categoria. */
    public function test_orcamento_especifico_sobrescreve_o_recorrente(): void
    {
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 800,
        ]);
        Orcamento::factory()->naCompetencia('2026-12')->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 1500,
        ]);

        $setembro = $this->listar('2026-09')['data'];
        $dezembro = $this->listar('2026-12')['data'];

        $this->assertCount(1, $setembro);
        $this->assertSame(800.0, (float) $setembro[0]['limite']);
        $this->assertTrue($setembro[0]['recorrente']);

        $this->assertCount(1, $dezembro);
        $this->assertSame(1500.0, (float) $dezembro[0]['limite']);
        $this->assertFalse($dezembro[0]['recorrente']);
    }

    public function test_totais_agregam_limite_gasto_e_status(): void
    {
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 800,
        ]);
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->lazer->id, 'valor_limite' => 200,
        ]);

        $this->gasto($this->alimentacao, 400);
        $this->gasto($this->lazer, 300);

        $resumo = $this->listar('2026-09')['resumo'];

        $this->assertSame(2, $resumo['quantidade']);
        $this->assertSame(1000.0, (float) $resumo['limite']);
        $this->assertSame(700.0, (float) $resumo['gasto']);
        $this->assertSame(300.0, (float) $resumo['restante']);
        $this->assertSame(1, $resumo['normais']);
        $this->assertSame(1, $resumo['estourados']);
    }

    public function test_orcamento_sem_gasto_nao_gera_percentual_invalido(): void
    {
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 500,
        ]);

        $resposta = $this->actingAs($this->user)->getJson('/api/orcamentos?competencia=2026-09');

        $this->assertStringNotContainsString('Infinity', $resposta->getContent());
        $this->assertStringNotContainsString('NaN', $resposta->getContent());
        $this->assertSame(0.0, (float) $resposta->json('data.0.percentual'));
    }

    // ------------------------------------------------------------- exclusão

    public function test_exclui_orcamento(): void
    {
        $orcamento = Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id,
        ]);

        $this->actingAs($this->user)->deleteJson("/api/orcamentos/{$orcamento->id}")->assertOk();

        $this->assertDatabaseMissing('orcamentos', ['id' => $orcamento->id]);
    }

    // ------------------------------------------------------------ isolamento

    public function test_a_nao_ve_orcamento_de_b(): void
    {
        $outro = User::factory()->create();

        Orcamento::factory()->create([
            'user_id' => $outro->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 9999,
        ]);

        $this->assertSame([], $this->listar('2026-09')['data']);
    }

    public function test_a_nao_exclui_orcamento_de_b(): void
    {
        $outro = User::factory()->create();
        $orcamento = Orcamento::factory()->create([
            'user_id' => $outro->id, 'categoria_id' => $this->alimentacao->id,
        ]);

        $this->actingAs($this->user)
            ->deleteJson("/api/orcamentos/{$orcamento->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('orcamentos', ['id' => $orcamento->id]);
    }

    public function test_gasto_de_outro_usuario_nao_consome_meu_orcamento(): void
    {
        $outro = User::factory()->create();

        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 500,
        ]);

        Gasto::factory()->create([
            'user_id' => $outro->id, 'categoria_id' => $this->alimentacao->id,
            'valor' => 5000, 'data' => '2026-09-05',
        ]);

        $this->assertSame(0.0, (float) $this->listar('2026-09')['data'][0]['gasto']);
    }

    // ------------------------------------ integração com saúde e dashboard

    /**
     * O quinto indicador da metodologia só entra quando há orçamento definido.
     * Sem nenhum, o peso 5 é redistribuído — punir quem não usa a
     * funcionalidade seria errado.
     */
    public function test_saude_financeira_so_ganha_o_indicador_quando_ha_orcamento(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 5000,
        ]);
        $this->gasto($this->alimentacao, 1000);
        $this->gasto($this->lazer, 500);
        $this->gasto($this->alimentacao, 200);

        $semOrcamento = $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data.saude');

        $this->assertCount(4, $semOrcamento['indicadores']);
        $this->assertStringContainsString('quatro indicadores', $semOrcamento['metodologia']);
        $this->assertStringContainsString('redistribuído', $semOrcamento['metodologia']);

        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->alimentacao->id, 'valor_limite' => 2000,
        ]);

        $comOrcamento = $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data.saude');

        $this->assertCount(5, $comOrcamento['indicadores']);
        $this->assertSame('orcamentos', $comOrcamento['indicadores'][4]['chave']);
        $this->assertStringContainsString('cinco indicadores', $comOrcamento['metodologia']);
        $this->assertLessThanOrEqual(100, $comOrcamento['pontuacao']);
    }

    public function test_orcamento_estourado_derruba_o_indicador_de_cumprimento(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 5000,
        ]);
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->lazer->id, 'valor_limite' => 100,
        ]);

        $this->gasto($this->lazer, 500);
        $this->gasto($this->alimentacao, 100);
        $this->gasto($this->alimentacao, 100);

        $indicador = collect(
            $this->actingAs($this->user)->getJson('/api/dashboard?competencia=2026-09')->json('data.saude.indicadores')
        )->firstWhere('chave', 'orcamentos');

        $this->assertSame(0.0, (float) $indicador['valor']);
        $this->assertSame(0.0, (float) $indicador['pontos']);
    }

    public function test_dashboard_alerta_sobre_orcamento_estourado(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 5000,
        ]);
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->lazer->id, 'valor_limite' => 100,
        ]);

        $this->gasto($this->lazer, 250);

        $dados = $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data');

        $insight = collect($dados['insights'])->firstWhere('tipo', 'orcamento_estourado');

        $this->assertNotNull($insight);
        $this->assertSame('critico', $insight['severidade']);
        $this->assertSame(150.0, (float) $insight['contexto']['excedente']);
        $this->assertStringContainsString('Lazer', $insight['titulo']);

        $this->assertSame(1, $dados['orcamentos']['totais']['estourados']);
    }
}
