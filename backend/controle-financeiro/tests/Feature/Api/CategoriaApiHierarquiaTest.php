<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Orcamento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A hierarquia pela API: criação, validação, listagem em árvore e exclusão.
 */
class CategoriaApiHierarquiaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Categoria $moradia;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->moradia = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Moradia', 'tipo' => 'necessidade', 'user_id' => null,
        ]);
    }

    private function criar(array $dados)
    {
        return $this->actingAs($this->user)->postJson('/api/categorias', $dados);
    }

    private function sub(string $nome, ?int $paiId = null, ?int $userId = null): Categoria
    {
        return Categoria::withoutGlobalScopes()->create([
            'nome'             => $nome,
            'categoria_pai_id' => $paiId ?? $this->moradia->id,
            'tipo'             => 'necessidade',
            'user_id'          => $userId,
        ]);
    }

    // -------------------------------------------------------------- criação

    public function test_cria_subcategoria_sob_uma_categoria_global(): void
    {
        $this->criar(['nome' => 'Aluguel', 'categoria_pai_id' => $this->moradia->id])
            ->assertCreated()
            ->assertJsonPath('data.nome', 'Aluguel')
            ->assertJsonPath('data.categoria_pai_id', $this->moradia->id)
            ->assertJsonPath('data.subcategoria', true)
            // Herdou o tipo sem que ninguém informasse.
            ->assertJsonPath('data.tipo', 'necessidade')
            ->assertJsonPath('data.global', false);
    }

    public function test_subcategoria_ignora_o_tipo_enviado_e_herda_o_do_pai(): void
    {
        $this->criar([
            'nome' => 'Aluguel', 'categoria_pai_id' => $this->moradia->id, 'tipo' => 'desejo',
        ])->assertCreated()->assertJsonPath('data.tipo', 'necessidade');
    }

    public function test_categoria_principal_continua_exigindo_tipo(): void
    {
        $this->criar(['nome' => 'Pets'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('tipo');
    }

    // ------------------------------------------------------- profundidade

    /** Categoria › Subcategoria e ponto. Nada de netos. */
    public function test_recusa_subcategoria_de_subcategoria(): void
    {
        $aluguel = $this->sub('Aluguel');

        $this->criar(['nome' => 'Primeira parcela', 'categoria_pai_id' => $aluguel->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('categoria_pai_id')
            ->assertJsonPath('errors.categoria_pai_id.0', 'Uma subcategoria não pode ter subcategorias.');
    }

    /** Nem pela edição, movendo uma categoria com filhas para debaixo de outra. */
    public function test_recusa_transformar_em_subcategoria_quem_tem_filhas(): void
    {
        $transporte = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Transporte', 'tipo' => 'necessidade', 'user_id' => $this->user->id,
        ]);
        $this->sub('Combustível', $transporte->id, $this->user->id);

        $this->actingAs($this->user)
            ->putJson("/api/categorias/{$transporte->id}", ['categoria_pai_id' => $this->moradia->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('categoria_pai_id');
    }

    public function test_recusa_categoria_como_mae_de_si_mesma(): void
    {
        $minha = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Pets', 'tipo' => 'desejo', 'user_id' => $this->user->id,
        ]);

        $this->actingAs($this->user)
            ->putJson("/api/categorias/{$minha->id}", ['categoria_pai_id' => $minha->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('categoria_pai_id');
    }

    public function test_recusa_pai_inexistente(): void
    {
        $this->criar(['nome' => 'Aluguel', 'categoria_pai_id' => 999999])
            ->assertStatus(422)
            ->assertJsonValidationErrors('categoria_pai_id');
    }

    /** O pai de outra pessoa simplesmente não existe para mim. */
    public function test_recusa_pai_de_outro_usuario(): void
    {
        $outro = User::factory()->create();
        $paiAlheio = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Privada do outro', 'tipo' => 'desejo', 'user_id' => $outro->id,
        ]);

        $this->criar(['nome' => 'Invasora', 'categoria_pai_id' => $paiAlheio->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('categoria_pai_id');
    }

    // -------------------------------------------------------- unicidade

    public function test_recusa_subcategoria_repetida_na_mesma_mae(): void
    {
        $this->sub('Aluguel');

        $this->criar(['nome' => 'ALUGUEL', 'categoria_pai_id' => $this->moradia->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nome');
    }

    /** "Manutenção" é legítima em Moradia e em Transporte. */
    public function test_aceita_o_mesmo_nome_de_subcategoria_em_maes_diferentes(): void
    {
        $transporte = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Transporte', 'tipo' => 'necessidade', 'user_id' => null,
        ]);
        $this->sub('Manutenção');

        $this->criar(['nome' => 'Manutenção', 'categoria_pai_id' => $transporte->id])
            ->assertCreated();
    }

    /** Uma subcategoria não colide com uma categoria principal de mesmo nome. */
    public function test_subcategoria_nao_colide_com_categoria_principal(): void
    {
        Categoria::withoutGlobalScopes()->create([
            'nome' => 'Internet', 'tipo' => 'necessidade', 'user_id' => null,
        ]);

        $this->criar(['nome' => 'Internet', 'categoria_pai_id' => $this->moradia->id])
            ->assertCreated();
    }

    // --------------------------------------------------------- listagem

    public function test_listagem_vem_em_arvore_com_subcategorias_aninhadas(): void
    {
        $this->sub('Aluguel');
        $this->sub('Água');

        $dados = $this->actingAs($this->user)->getJson('/api/categorias')
            ->assertOk()->json('data');

        $moradia = collect($dados)->firstWhere('nome', 'Moradia');

        $this->assertNotNull($moradia);
        $this->assertFalse($moradia['subcategoria']);
        $this->assertCount(2, $moradia['subcategorias']);
        $this->assertEqualsCanonicalizing(
            ['Aluguel', 'Água'],
            array_column($moradia['subcategorias'], 'nome')
        );

        // As subcategorias não aparecem soltas no primeiro nível.
        $this->assertNull(collect($dados)->firstWhere('nome', 'Aluguel'));
    }

    /**
     * Contagem ACUMULADA na mãe: é o número que decide se dá para excluir.
     */
    public function test_contagem_da_mae_soma_os_lancamentos_das_filhas(): void
    {
        $aluguel = $this->sub('Aluguel');
        $agua = $this->sub('Água');

        Gasto::factory()->count(2)->create(['user_id' => $this->user->id, 'categoria_id' => $this->moradia->id]);
        Gasto::factory()->count(5)->create(['user_id' => $this->user->id, 'categoria_id' => $aluguel->id]);
        Gasto::factory()->count(3)->create(['user_id' => $this->user->id, 'categoria_id' => $agua->id]);

        $dados = $this->actingAs($this->user)->getJson('/api/categorias')->json('data');
        $moradia = collect($dados)->firstWhere('nome', 'Moradia');

        $this->assertSame(10, $moradia['total_lancamentos']);
        $this->assertSame(2, $moradia['lancamentos_diretos']);

        $porNome = collect($moradia['subcategorias'])->keyBy('nome');
        $this->assertSame(5, $porNome['Aluguel']['total_lancamentos']);
        $this->assertSame(3, $porNome['Água']['total_lancamentos']);
    }

    public function test_contagem_nao_soma_lancamentos_de_outro_usuario(): void
    {
        $aluguel = $this->sub('Aluguel');
        $outro = User::factory()->create();

        Gasto::factory()->count(4)->create(['user_id' => $outro->id, 'categoria_id' => $aluguel->id]);
        Gasto::factory()->create(['user_id' => $this->user->id, 'categoria_id' => $aluguel->id]);

        $dados = $this->actingAs($this->user)->getJson('/api/categorias')->json('data');
        $moradia = collect($dados)->firstWhere('nome', 'Moradia');

        $this->assertSame(1, $moradia['total_lancamentos']);
    }

    // --------------------------------------------------------- exclusão

    /**
     * A regra é da APLICAÇÃO. Confiar no cascade apagaria os lançamentos das
     * subcategorias em silêncio.
     */
    public function test_recusa_excluir_mae_com_lancamentos_nas_filhas(): void
    {
        $aluguel = $this->sub('Aluguel', null, $this->user->id);
        $minhaMoradia = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Minha moradia', 'tipo' => 'necessidade', 'user_id' => $this->user->id,
        ]);
        $aluguel->update(['categoria_pai_id' => $minhaMoradia->id]);

        Gasto::factory()->count(3)->create(['user_id' => $this->user->id, 'categoria_id' => $aluguel->id]);

        $this->actingAs($this->user)->deleteJson("/api/categorias/{$minhaMoradia->id}")
            ->assertStatus(422)
            ->assertJsonPath('motivo', 'lancamentos')
            ->assertJsonPath('total_lancamentos', 3);

        // Nada foi apagado: nem a mãe, nem a filha, nem os lançamentos.
        $this->assertDatabaseHas('categorias', ['id' => $minhaMoradia->id]);
        $this->assertDatabaseHas('categorias', ['id' => $aluguel->id]);
        $this->assertSame(3, Gasto::withoutGlobalScope('doUsuario')->count());
    }

    public function test_recusa_excluir_mae_que_ainda_tem_subcategorias(): void
    {
        $minha = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Minha categoria', 'tipo' => 'desejo', 'user_id' => $this->user->id,
        ]);
        $this->sub('Uma filha', $minha->id, $this->user->id);

        $this->actingAs($this->user)->deleteJson("/api/categorias/{$minha->id}")
            ->assertStatus(422)
            ->assertJsonPath('motivo', 'subcategorias')
            ->assertJsonPath('subcategorias', 1);

        $this->assertDatabaseHas('categorias', ['id' => $minha->id]);
    }

    public function test_recusa_excluir_categoria_com_orcamento(): void
    {
        $minha = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Com orçamento', 'tipo' => 'desejo', 'user_id' => $this->user->id,
        ]);
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $minha->id,
        ]);

        $this->actingAs($this->user)->deleteJson("/api/categorias/{$minha->id}")
            ->assertStatus(422)
            ->assertJsonPath('motivo', 'orcamentos');

        $this->assertDatabaseHas('categorias', ['id' => $minha->id]);
    }

    public function test_exclui_subcategoria_sem_dependencias(): void
    {
        $minha = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Minha categoria', 'tipo' => 'desejo', 'user_id' => $this->user->id,
        ]);
        $filha = $this->sub('Filha livre', $minha->id, $this->user->id);

        $this->actingAs($this->user)->deleteJson("/api/categorias/{$filha->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Subcategoria excluída com sucesso.');

        $this->assertDatabaseMissing('categorias', ['id' => $filha->id]);
        $this->assertDatabaseHas('categorias', ['id' => $minha->id]);
    }

    public function test_exclui_categoria_principal_sem_dependencias(): void
    {
        $minha = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Categoria livre', 'tipo' => 'desejo', 'user_id' => $this->user->id,
        ]);

        $this->actingAs($this->user)->deleteJson("/api/categorias/{$minha->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Categoria excluída com sucesso.');

        $this->assertDatabaseMissing('categorias', ['id' => $minha->id]);
    }

    // ------------------------------------------------------- isolamento

    public function test_subcategoria_de_outro_usuario_nao_aparece_nem_e_alcancavel(): void
    {
        $outro = User::factory()->create();
        $alheia = $this->sub('Privada alheia', $this->moradia->id, $outro->id);

        $dados = $this->actingAs($this->user)->getJson('/api/categorias')->json('data');
        $moradia = collect($dados)->firstWhere('nome', 'Moradia');

        $this->assertEmpty($moradia['subcategorias']);

        $this->actingAs($this->user)->putJson("/api/categorias/{$alheia->id}", ['nome' => 'Tomada'])
            ->assertNotFound();
        $this->actingAs($this->user)->deleteJson("/api/categorias/{$alheia->id}")
            ->assertNotFound();
    }

    /** Categoria global não é editável nem excluível por usuário nenhum. */
    public function test_categoria_global_nao_pode_ser_alterada(): void
    {
        $this->actingAs($this->user)->putJson("/api/categorias/{$this->moradia->id}", ['nome' => 'Sequestrada'])
            ->assertForbidden();
        $this->actingAs($this->user)->deleteJson("/api/categorias/{$this->moradia->id}")
            ->assertForbidden();

        $this->assertSame('Moradia', $this->moradia->fresh()->nome);
    }

    /** `user_id` no corpo não decide dono. */
    public function test_mass_assignment_de_user_id_nao_cria_categoria_para_outro(): void
    {
        $outro = User::factory()->create();

        $id = $this->criar([
            'nome' => 'Forjada', 'tipo' => 'desejo', 'user_id' => $outro->id,
        ])->assertCreated()->json('data.id');

        $this->assertSame(
            $this->user->id,
            Categoria::withoutGlobalScopes()->find($id)->user_id
        );
    }
}
