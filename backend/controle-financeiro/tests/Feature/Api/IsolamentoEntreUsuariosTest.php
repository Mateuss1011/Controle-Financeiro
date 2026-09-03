<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Salario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Usuário A não pode alcançar NADA do usuário B, inclusive manipulando ids
 * diretamente na URL. Cada método ataca um vetor diferente.
 */
class IsolamentoEntreUsuariosTest extends TestCase
{
    use RefreshDatabase;

    private User $usuarioA;
    private User $usuarioB;
    private Categoria $categoriaGlobal;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuarioA = User::factory()->create();
        $this->usuarioB = User::factory()->create();
        $this->categoriaGlobal = Categoria::factory()->create(['user_id' => null]);
    }

    private function gastoDoB(): Gasto
    {
        return Gasto::factory()->create([
            'user_id'      => $this->usuarioB->id,
            'categoria_id' => $this->categoriaGlobal->id,
        ]);
    }

    public function test_a_nao_lista_gastos_de_b(): void
    {
        $this->gastoDoB();
        Gasto::factory()->create([
            'user_id'      => $this->usuarioA->id,
            'categoria_id' => $this->categoriaGlobal->id,
            'descricao'    => 'Meu gasto',
        ]);

        $resposta = $this->actingAs($this->usuarioA)->getJson('/api/gastos');

        $resposta->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('Meu gasto', $resposta->json('data.0.descricao'));
    }

    public function test_a_nao_visualiza_gasto_de_b_pelo_id(): void
    {
        $gasto = $this->gastoDoB();

        $this->actingAs($this->usuarioA)
            ->getJson("/api/gastos/{$gasto->id}")
            ->assertNotFound();
    }

    public function test_a_nao_edita_gasto_de_b_pelo_id(): void
    {
        $gasto = $this->gastoDoB();

        $this->actingAs($this->usuarioA)
            ->putJson("/api/gastos/{$gasto->id}", ['descricao' => 'invadido'])
            ->assertNotFound();

        $this->assertDatabaseHas('gastos', [
            'id'        => $gasto->id,
            'descricao' => $gasto->descricao,
        ]);
    }

    public function test_a_nao_exclui_gasto_de_b_pelo_id(): void
    {
        $gasto = $this->gastoDoB();

        $this->actingAs($this->usuarioA)
            ->deleteJson("/api/gastos/{$gasto->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('gastos', ['id' => $gasto->id]);
    }

    public function test_gasto_criado_por_a_pertence_sempre_a_a(): void
    {
        // Mesmo forjando user_id no corpo da requisição.
        $this->actingAs($this->usuarioA)->postJson('/api/gastos', [
            'descricao'    => 'Tentativa',
            'valor'        => 100,
            'data'         => '2026-09-01',
            'categoria_id' => $this->categoriaGlobal->id,
            'user_id'      => $this->usuarioB->id,
        ])->assertCreated();

        $this->assertDatabaseHas('gastos', [
            'descricao' => 'Tentativa',
            'user_id'   => $this->usuarioA->id,
        ]);
        $this->assertDatabaseMissing('gastos', [
            'descricao' => 'Tentativa',
            'user_id'   => $this->usuarioB->id,
        ]);
    }

    public function test_a_nao_associa_gasto_a_categoria_privada_de_b(): void
    {
        $categoriaDoB = Categoria::factory()->create(['user_id' => $this->usuarioB->id]);

        $this->actingAs($this->usuarioA)->postJson('/api/gastos', [
            'descricao'    => 'Tentativa',
            'valor'        => 100,
            'data'         => '2026-09-01',
            'categoria_id' => $categoriaDoB->id,
        ])->assertStatus(422)->assertJsonValidationErrors('categoria_id');
    }

    public function test_a_nao_lista_categorias_privadas_de_b(): void
    {
        Categoria::factory()->create(['user_id' => $this->usuarioB->id, 'nome' => 'Privada do B']);
        Categoria::factory()->create(['user_id' => $this->usuarioA->id, 'nome' => 'Privada do A']);

        $nomes = $this->actingAs($this->usuarioA)->getJson('/api/categorias')
            ->assertOk()
            ->json('data.*.nome');

        $this->assertContains('Privada do A', $nomes);
        $this->assertNotContains('Privada do B', $nomes);
        $this->assertContains($this->categoriaGlobal->nome, $nomes);
    }

    public function test_a_nao_edita_categoria_privada_de_b(): void
    {
        $categoria = Categoria::factory()->create(['user_id' => $this->usuarioB->id]);

        $this->actingAs($this->usuarioA)
            ->putJson("/api/categorias/{$categoria->id}", ['nome' => 'invadida'])
            ->assertNotFound();
    }

    public function test_ninguem_edita_categoria_global(): void
    {
        $this->actingAs($this->usuarioA)
            ->putJson("/api/categorias/{$this->categoriaGlobal->id}", ['nome' => 'renomeada'])
            ->assertForbidden();
    }

    public function test_a_nao_lista_rendas_de_b(): void
    {
        Salario::factory()->create(['user_id' => $this->usuarioB->id, 'valor' => 9999]);
        Salario::factory()->create(['user_id' => $this->usuarioA->id, 'valor' => 1111]);

        $resposta = $this->actingAs($this->usuarioA)->getJson('/api/rendas');

        $resposta->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame(1111.0, (float) $resposta->json('data.0.valor'));
    }

    public function test_a_nao_visualiza_renda_de_b_pelo_id(): void
    {
        $renda = Salario::factory()->create(['user_id' => $this->usuarioB->id]);

        $this->actingAs($this->usuarioA)
            ->getJson("/api/rendas/{$renda->id}")
            ->assertNotFound();
    }

    public function test_a_nao_exclui_renda_de_b_pelo_id(): void
    {
        $renda = Salario::factory()->create(['user_id' => $this->usuarioB->id]);

        $this->actingAs($this->usuarioA)
            ->deleteJson("/api/rendas/{$renda->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('salarios', ['id' => $renda->id, 'deleted_at' => null]);
    }

    public function test_regra_de_a_nao_considera_dados_de_b(): void
    {
        Salario::factory()->create([
            'user_id'     => $this->usuarioB->id,
            'valor'       => 10000,
            'competencia' => '2026-09-01',
        ]);
        Gasto::factory()->create([
            'user_id'      => $this->usuarioB->id,
            'categoria_id' => $this->categoriaGlobal->id,
            'valor'        => 5000,
            'data'         => '2026-09-10',
        ]);

        $this->actingAs($this->usuarioA)
            ->getJson('/api/regra?competencia=2026-09')
            ->assertOk()
            ->assertJsonPath('data.renda', fn ($v) => (float) $v === 0.0)
            ->assertJsonPath('data.total_gasto', fn ($v) => (float) $v === 0.0);
    }
}
