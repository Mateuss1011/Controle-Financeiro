<?php

namespace Tests\Feature\Api;

use App\Models\Salario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RendaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
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
}
