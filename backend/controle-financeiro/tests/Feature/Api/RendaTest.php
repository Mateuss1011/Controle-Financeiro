<?php

namespace Tests\Feature\Api;

use App\Models\Salario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class RendaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // "Competência atual" e "média dos últimos 12 meses" dependem de hoje.
        Carbon::setTestNow('2026-09-15 12:00:00');

        $this->user = User::factory()->create();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_registra_renda_de_uma_competencia(): void
    {
        $this->actingAs($this->user)->postJson('/api/rendas', [
            'valor'       => 5500,
            'competencia' => '2026-09',
        ])->assertCreated()
            ->assertJsonPath('data.valor', fn ($v) => (float) $v === 5500.0)
            ->assertJsonPath('data.competencia', '2026-09');

        // Comparação pelo model, e não por string: o SQLite dos testes guarda
        // 'YYYY-MM-DD 00:00:00' onde o MariaDB (coluna DATE) guarda 'YYYY-MM-DD'.
        $renda = Salario::withoutGlobalScopes()->where('user_id', $this->user->id)->sole();
        $this->assertSame('2026-09-01', $renda->competencia->toDateString());
    }

    /**
     * Bug original: o store não devolvia o id, o frontend nunca guardava a
     * referência e cada envio do formulário criava uma renda nova.
     */
    public function test_registrar_duas_vezes_na_mesma_competencia_atualiza_em_vez_de_duplicar(): void
    {
        $this->actingAs($this->user)->postJson('/api/rendas', [
            'valor' => 5000, 'competencia' => '2026-09',
        ])->assertCreated();

        $this->actingAs($this->user)->postJson('/api/rendas', [
            'valor' => 5500, 'competencia' => '2026-09',
        ])->assertOk()->assertJsonPath('data.valor', fn ($v) => (float) $v === 5500.0);

        $this->assertSame(1, Salario::withoutGlobalScopes()
            ->where('user_id', $this->user->id)
            ->whereDate('competencia', '2026-09-01')
            ->count());
    }

    public function test_store_devolve_o_id_do_registro(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/rendas', ['valor' => 100, 'competencia' => '2026-09'])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['id', 'valor', 'competencia']]);
    }

    public function test_competencias_diferentes_convivem_no_historico(): void
    {
        foreach ([['2026-07', 5200], ['2026-08', 5200], ['2026-09', 5500]] as [$comp, $valor]) {
            $this->actingAs($this->user)->postJson('/api/rendas', [
                'valor' => $valor, 'competencia' => $comp,
            ])->assertCreated();
        }

        $resposta = $this->actingAs($this->user)->getJson('/api/rendas');

        $resposta->assertOk()->assertJsonCount(3, 'data');
        // Ordenado da competência mais recente para a mais antiga.
        $this->assertSame('2026-09', $resposta->json('data.0.competencia'));
        $this->assertSame('2026-07', $resposta->json('data.2.competencia'));
    }

    public function test_consulta_renda_de_uma_competencia_especifica(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 5500,
        ]);

        $this->actingAs($this->user)->getJson('/api/rendas/competencia/2026-09')
            ->assertOk()
            ->assertJsonPath('data.valor', fn ($v) => (float) $v === 5500.0);
    }

    public function test_competencia_sem_renda_devolve_null_e_nao_erro(): void
    {
        $this->actingAs($this->user)->getJson('/api/rendas/competencia/2026-01')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_recusa_competencia_em_formato_invalido(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/rendas', ['valor' => 100, 'competencia' => '09/2026'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('competencia');
    }

    public function test_recusa_valor_negativo(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/rendas', ['valor' => -1, 'competencia' => '2026-09'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('valor');
    }

    public function test_renda_excluida_nao_aparece_no_historico(): void
    {
        $renda = Salario::factory()->naCompetencia('2026-09')->create(['user_id' => $this->user->id]);

        $this->actingAs($this->user)->deleteJson("/api/rendas/{$renda->id}")->assertOk();

        $this->actingAs($this->user)->getJson('/api/rendas')->assertOk()->assertJsonCount(0, 'data');
        // Soft delete: o registro continua existindo fisicamente.
        $this->assertDatabaseHas('salarios', ['id' => $renda->id]);
    }

    /**
     * Regressão: `withoutGlobalScopes()` derrubava também o SoftDeletingScope,
     * e uma renda desativada voltava a ser considerada a renda da competência.
     * Encontrado ao rodar a API contra os dados reais de desenvolvimento.
     */
    public function test_renda_soft_deleted_nao_e_considerada_na_competencia(): void
    {
        $antiga = Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 227393,
        ]);
        $antiga->delete();

        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 2086.65,
        ]);

        $this->actingAs($this->user)->getJson('/api/rendas/competencia/2026-09')
            ->assertOk()
            ->assertJsonPath('data.valor', fn ($v) => (float) $v === 2086.65);

        $this->actingAs($this->user)->getJson('/api/regra?competencia=2026-09')
            ->assertOk()
            ->assertJsonPath('data.renda', fn ($v) => (float) $v === 2086.65);
    }

    // ------------------------------------------------------- contexto do histórico

    public function test_historico_informa_a_competencia_atual_e_se_ela_tem_renda(): void
    {
        $resposta = $this->actingAs($this->user)->getJson('/api/rendas');

        $resposta->assertOk()
            ->assertJsonPath('resumo.competencia_atual', '2026-09')
            ->assertJsonPath('resumo.tem_renda_atual', false)
            ->assertJsonPath('resumo.renda_atual', null)
            ->assertJsonPath('resumo.total_registros', 0);

        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 5500,
        ]);

        $this->actingAs($this->user)->getJson('/api/rendas')
            ->assertJsonPath('resumo.tem_renda_atual', true)
            ->assertJsonPath('resumo.renda_atual', fn ($v) => (float) $v === 5500.0)
            ->assertJsonPath('resumo.total_registros', 1);
    }

    public function test_historico_calcula_a_variacao_em_relacao_ao_mes_anterior(): void
    {
        Salario::factory()->naCompetencia('2026-07')->create(['user_id' => $this->user->id, 'valor' => 5000]);
        Salario::factory()->naCompetencia('2026-08')->create(['user_id' => $this->user->id, 'valor' => 5000]);
        Salario::factory()->naCompetencia('2026-09')->create(['user_id' => $this->user->id, 'valor' => 5500]);

        $variacoes = $this->actingAs($this->user)->getJson('/api/rendas')->json('resumo.variacoes');

        // A mais antiga não tem com o que comparar.
        $this->assertNull($variacoes['2026-07']['variacao_percentual']);
        $this->assertNull($variacoes['2026-07']['anterior']);

        $this->assertSame(0.0, (float) $variacoes['2026-08']['variacao_percentual']);

        $this->assertSame(10.0, (float) $variacoes['2026-09']['variacao_percentual']);
        $this->assertSame(500.0, (float) $variacoes['2026-09']['variacao_absoluta']);
        $this->assertSame('2026-08', $variacoes['2026-09']['competencia_anterior']);
    }

    public function test_historico_calcula_a_media_dos_ultimos_doze_meses(): void
    {
        Salario::factory()->naCompetencia('2026-08')->create(['user_id' => $this->user->id, 'valor' => 4000]);
        Salario::factory()->naCompetencia('2026-09')->create(['user_id' => $this->user->id, 'valor' => 6000]);
        // Fora da janela de 12 meses: não deve entrar na média.
        Salario::factory()->naCompetencia('2025-01')->create(['user_id' => $this->user->id, 'valor' => 100000]);

        $this->actingAs($this->user)->getJson('/api/rendas')
            ->assertJsonPath('resumo.media_12_meses', fn ($v) => (float) $v === 5000.0);
    }

    public function test_historico_nao_gera_percentual_sobre_base_zero(): void
    {
        Salario::factory()->naCompetencia('2026-08')->create(['user_id' => $this->user->id, 'valor' => 0]);
        Salario::factory()->naCompetencia('2026-09')->create(['user_id' => $this->user->id, 'valor' => 3000]);

        $variacoes = $this->actingAs($this->user)->getJson('/api/rendas')->json('resumo.variacoes');

        $this->assertNull($variacoes['2026-09']['variacao_percentual']);
        $this->assertSame(3000.0, (float) $variacoes['2026-09']['variacao_absoluta']);
    }

    public function test_renda_excluida_sai_do_contexto_do_historico(): void
    {
        $renda = Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 5500,
        ]);

        $this->actingAs($this->user)->deleteJson("/api/rendas/{$renda->id}")->assertOk();

        $this->actingAs($this->user)->getJson('/api/rendas')
            ->assertJsonPath('resumo.tem_renda_atual', false)
            ->assertJsonPath('resumo.total_registros', 0)
            ->assertJsonPath('resumo.media_12_meses', null);
    }

    public function test_contexto_do_historico_nao_enxerga_renda_de_outro_usuario(): void
    {
        $outro = User::factory()->create();

        Salario::factory()->naCompetencia('2026-09')->create(['user_id' => $outro->id, 'valor' => 99999]);
        Salario::factory()->naCompetencia('2026-09')->create(['user_id' => $this->user->id, 'valor' => 1000]);

        $this->actingAs($this->user)->getJson('/api/rendas')
            ->assertJsonPath('resumo.renda_atual', fn ($v) => (float) $v === 1000.0)
            ->assertJsonPath('resumo.total_registros', 1);
    }

    public function test_registrar_renda_de_competencia_antiga_e_permitido(): void
    {
        $this->actingAs($this->user)->postJson('/api/rendas', [
            'valor' => 4200, 'competencia' => '2025-03', 'descricao' => 'Salário anterior',
        ])->assertCreated()
            ->assertJsonPath('data.competencia', '2025-03')
            ->assertJsonPath('data.descricao', 'Salário anterior');
    }
}
