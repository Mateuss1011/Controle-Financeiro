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
    // --------------------------------------------------- Fase J: unicidade

    /**
     * A regra antiga olhava so `user_id = eu`, entao dava para criar uma
     * "Alimentacao" privada convivendo com a "Alimentacao" global. As duas
     * apareciam identicas no seletor de lancamento, sem nada que as
     * distinguisse, e cada uma somava para um lado do relatorio.
     */
    public function test_nome_precisa_ser_inedito_tambem_contra_as_globais(): void
    {
        Categoria::factory()->create(['user_id' => null, 'nome' => 'Alimentacao']);

        $this->actingAs($this->user)->postJson('/api/categorias', [
            'nome' => 'Alimentacao',
            'tipo' => 'desejo',
        ])->assertStatus(422)->assertJsonValidationErrors('nome');
    }

    public function test_nome_continua_inedito_contra_as_proprias(): void
    {
        Categoria::factory()->create(['user_id' => $this->user->id, 'nome' => 'Pets']);

        $this->actingAs($this->user)->postJson('/api/categorias', [
            'nome' => 'Pets',
            'tipo' => 'desejo',
        ])->assertStatus(422)->assertJsonValidationErrors('nome');
    }

    /** O nome de outra pessoa nao me atrapalha: nunca vejo a categoria dela. */
    public function test_nome_usado_por_outro_usuario_continua_livre(): void
    {
        $outro = User::factory()->create();
        Categoria::factory()->create(['user_id' => $outro->id, 'nome' => 'Pets']);

        $this->actingAs($this->user)->postJson('/api/categorias', [
            'nome' => 'Pets',
            'tipo' => 'desejo',
        ])->assertCreated();
    }

    public function test_editar_mantendo_o_proprio_nome_nao_acusa_duplicidade(): void
    {
        $categoria = Categoria::factory()->create([
            'user_id' => $this->user->id,
            'nome'    => 'Pets',
        ]);

        $this->actingAs($this->user)
            ->putJson("/api/categorias/{$categoria->id}", ['nome' => 'Pets', 'tipo' => 'desejo'])
            ->assertOk()
            ->assertJsonPath('data.tipo', 'desejo');
    }

    public function test_editar_para_o_nome_de_uma_global_e_recusado(): void
    {
        Categoria::factory()->create(['user_id' => null, 'nome' => 'Moradia']);
        $categoria = Categoria::factory()->create([
            'user_id' => $this->user->id,
            'nome'    => 'Casa',
        ]);

        $this->actingAs($this->user)
            ->putJson("/api/categorias/{$categoria->id}", ['nome' => 'Moradia'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nome');
    }

    // ------------------------------------------- Fase J: uso na listagem

    /**
     * A tela precisa saber, ANTES do clique, se a exclusao vai ser recusada.
     */
    public function test_listagem_traz_quantos_lancamentos_usam_cada_categoria(): void
    {
        $usada = Categoria::factory()->create(['user_id' => $this->user->id, 'nome' => 'Usada']);
        $vazia = Categoria::factory()->create(['user_id' => $this->user->id, 'nome' => 'Vazia']);

        Gasto::factory()->count(3)->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $usada->id,
        ]);

        $itens = collect($this->actingAs($this->user)->getJson('/api/categorias')->json('data'))
            ->keyBy('nome');

        $this->assertSame(3, $itens['Usada']['total_lancamentos']);
        $this->assertSame(0, $itens['Vazia']['total_lancamentos']);
    }

    /** A contagem e do uso de QUEM PEDE, inclusive nas categorias globais. */
    public function test_contagem_nao_soma_lancamentos_de_outro_usuario(): void
    {
        $global = Categoria::factory()->create(['user_id' => null, 'nome' => 'Compartilhada']);
        $outro = User::factory()->create();

        Gasto::factory()->count(5)->create([
            'user_id'      => $outro->id,
            'categoria_id' => $global->id,
        ]);
        Gasto::factory()->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $global->id,
        ]);

        $itens = collect($this->actingAs($this->user)->getJson('/api/categorias')->json('data'))
            ->keyBy('nome');

        $this->assertSame(1, $itens['Compartilhada']['total_lancamentos']);
    }

    public function test_recusa_de_exclusao_informa_quantos_lancamentos(): void
    {
        $categoria = Categoria::factory()->create(['user_id' => $this->user->id]);
        Gasto::factory()->count(2)->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $categoria->id,
        ]);

        $this->actingAs($this->user)
            ->deleteJson("/api/categorias/{$categoria->id}")
            ->assertStatus(422)
            ->assertJsonPath('total_lancamentos', 2)
            ->assertJsonPath('message', 'Esta categoria tem 2 lançamentos e não pode ser excluída.');
    }
}
