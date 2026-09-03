<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GastoTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Categoria $categoria;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->categoria = Categoria::factory()->create(['user_id' => null]);
    }

    public function test_cria_gasto(): void
    {
        $this->actingAs($this->user)->postJson('/api/gastos', [
            'descricao'    => 'Conta de luz',
            'valor'        => 167.56,
            'data'         => '2026-09-01',
            'categoria_id' => $this->categoria->id,
        ])->assertCreated()
            ->assertJsonPath('data.descricao', 'Conta de luz')
            ->assertJsonPath('data.valor', fn ($v) => (float) $v === 167.56)
            ->assertJsonPath('data.categoria.id', $this->categoria->id);

        $this->assertDatabaseHas('gastos', ['descricao' => 'Conta de luz']);
    }

    public function test_edita_gasto(): void
    {
        $gasto = Gasto::factory()->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $this->categoria->id,
        ]);

        $this->actingAs($this->user)
            ->putJson("/api/gastos/{$gasto->id}", ['descricao' => 'Atualizado', 'valor' => 50])
            ->assertOk()
            ->assertJsonPath('data.descricao', 'Atualizado');

        $this->assertDatabaseHas('gastos', ['id' => $gasto->id, 'descricao' => 'Atualizado']);
    }

    public function test_exclui_gasto(): void
    {
        $gasto = Gasto::factory()->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $this->categoria->id,
        ]);

        $this->actingAs($this->user)->deleteJson("/api/gastos/{$gasto->id}")->assertOk();

        $this->assertDatabaseMissing('gastos', ['id' => $gasto->id]);
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function payloadsInvalidos(): array
    {
        return [
            'sem descrição'    => [['descricao' => ''], 'descricao'],
            'valor zero'       => [['valor' => 0], 'valor'],
            'valor negativo'   => [['valor' => -10], 'valor'],
            'valor não numérico' => [['valor' => 'abc'], 'valor'],
            'data inválida'    => [['data' => 'não é data'], 'data'],
            'sem categoria'    => [['categoria_id' => null], 'categoria_id'],
            'categoria inexistente' => [['categoria_id' => 99999], 'categoria_id'],
        ];
    }

    /**
     * @param array<string, mixed> $sobrescreve
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('payloadsInvalidos')]
    public function test_validacao_devolve_erro_no_campo_certo(array $sobrescreve, string $campo): void
    {
        $payload = array_merge([
            'descricao'    => 'Válido',
            'valor'        => 10,
            'data'         => '2026-09-01',
            'categoria_id' => $this->categoria->id,
        ], $sobrescreve);

        $this->actingAs($this->user)->postJson('/api/gastos', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors($campo);
    }

    public function test_listagem_e_paginada(): void
    {
        Gasto::factory()->count(25)->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $this->categoria->id,
        ]);

        $this->actingAs($this->user)->getJson('/api/gastos')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.total', 25);
    }

    public function test_filtra_por_competencia(): void
    {
        Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->categoria->id,
            'data' => '2026-09-15', 'descricao' => 'De setembro',
        ]);
        Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->categoria->id,
            'data' => '2026-08-15', 'descricao' => 'De agosto',
        ]);

        $resposta = $this->actingAs($this->user)->getJson('/api/gastos?competencia=2026-09');

        $resposta->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('De setembro', $resposta->json('data.0.descricao'));
    }

    public function test_filtra_por_tipo_de_categoria(): void
    {
        $desejo = Categoria::factory()->doTipo(TipoCategoria::Desejo)->create(['user_id' => null]);

        Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $desejo->id, 'descricao' => 'Cinema',
        ]);
        Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->categoria->id, 'descricao' => 'Outro',
        ]);

        $resposta = $this->actingAs($this->user)->getJson('/api/gastos?tipo=desejo');

        $resposta->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('Cinema', $resposta->json('data.0.descricao'));
    }

    public function test_busca_por_descricao(): void
    {
        Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->categoria->id, 'descricao' => 'Netflix',
        ]);
        Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->categoria->id, 'descricao' => 'Padaria',
        ]);

        $resposta = $this->actingAs($this->user)->getJson('/api/gastos?busca=net');

        $resposta->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('Netflix', $resposta->json('data.0.descricao'));
    }
}
