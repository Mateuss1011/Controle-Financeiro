<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoriaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_cria_categoria_privada(): void
    {
        $this->actingAs($this->user)->postJson('/api/categorias', [
            'nome' => 'Pets',
            'tipo' => 'necessidade',
        ])->assertCreated()
            ->assertJsonPath('data.nome', 'Pets')
            ->assertJsonPath('data.tipo', 'necessidade')
            ->assertJsonPath('data.global', false);

        $this->assertDatabaseHas('categorias', [
            'nome'    => 'Pets',
            'user_id' => $this->user->id,
        ]);
    }

    /**
     * Antes o controller não validava `tipo`; o MariaDB gravava silenciosamente
     * o primeiro valor do ENUM ('necessidade') e a categoria entrava na faixa
     * errada da regra 50/30/20.
     */
    public function test_tipo_e_obrigatorio(): void
    {
        $this->actingAs($this->user)->postJson('/api/categorias', ['nome' => 'Sem tipo'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('tipo');

        $this->assertDatabaseMissing('categorias', ['nome' => 'Sem tipo']);
    }

    public function test_tipo_precisa_ser_um_valor_valido(): void
    {
        $this->actingAs($this->user)->postJson('/api/categorias', [
            'nome' => 'Inventada',
            'tipo' => 'investimento_maluco',
        ])->assertStatus(422)->assertJsonValidationErrors('tipo');
    }

    public function test_aceita_os_tres_tipos_da_regra(): void
    {
        foreach (TipoCategoria::valores() as $i => $tipo) {
            $this->actingAs($this->user)->postJson('/api/categorias', [
                'nome' => 'Categoria ' . $i,
                'tipo' => $tipo,
            ])->assertCreated()->assertJsonPath('data.tipo', $tipo);
        }
    }

    public function test_nao_permite_nome_duplicado_para_o_mesmo_usuario(): void
    {
        Categoria::factory()->create(['user_id' => $this->user->id, 'nome' => 'Pets']);

        $this->actingAs($this->user)->postJson('/api/categorias', [
            'nome' => 'Pets', 'tipo' => 'desejo',
        ])->assertStatus(422)->assertJsonValidationErrors('nome');
    }

    public function test_listagem_traz_globais_e_privadas(): void
    {
        Categoria::factory()->create(['user_id' => null, 'nome' => 'Global']);
        Categoria::factory()->create(['user_id' => $this->user->id, 'nome' => 'Minha']);

        $resposta = $this->actingAs($this->user)->getJson('/api/categorias')->assertOk();

        $this->assertCount(2, $resposta->json('data'));
    }

    public function test_categoria_com_lancamentos_nao_pode_ser_excluida(): void
    {
        $categoria = Categoria::factory()->create(['user_id' => $this->user->id]);
        Gasto::factory()->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $categoria->id,
        ]);

        $this->actingAs($this->user)->deleteJson("/api/categorias/{$categoria->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('categorias', ['id' => $categoria->id]);
    }

    public function test_exclui_categoria_sem_lancamentos(): void
    {
        $categoria = Categoria::factory()->create(['user_id' => $this->user->id]);

        $this->actingAs($this->user)->deleteJson("/api/categorias/{$categoria->id}")->assertOk();

        $this->assertDatabaseMissing('categorias', ['id' => $categoria->id]);
    }
}
