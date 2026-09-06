<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A hierarquia em si: dois níveis, tipo herdado, raiz de agregação.
 *
 * Estes testes olham o MODELO, não a API. Os de rota ficam em CategoriaTest.
 */
class CategoriaHierarquiaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    private function principal(string $nome, TipoCategoria $tipo, ?int $userId = null): Categoria
    {
        return Categoria::withoutGlobalScopes()->create([
            'nome' => $nome, 'tipo' => $tipo->value, 'user_id' => $userId,
        ]);
    }

    // ------------------------------------------------------- tipo herdado

    /**
     * O caso que a arquitetura existe para impedir: Moradia necessidade com
     * Aluguel desejo.
     */
    public function test_subcategoria_herda_o_tipo_do_pai_mesmo_pedindo_outro(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);

        $aluguel = Categoria::withoutGlobalScopes()->create([
            'nome'             => 'Aluguel',
            'categoria_pai_id' => $moradia->id,
            'tipo'             => TipoCategoria::Desejo->value,
        ]);

        $this->assertSame(TipoCategoria::Necessidade, $aluguel->fresh()->tipo);
    }

    /** Sem informar tipo nenhum, a subcategoria ainda nasce coerente. */
    public function test_subcategoria_sem_tipo_informado_recebe_o_do_pai(): void
    {
        $poupanca = $this->principal('Investimentos', TipoCategoria::Poupanca);

        $renda = Categoria::withoutGlobalScopes()->create([
            'nome'             => 'Renda fixa',
            'categoria_pai_id' => $poupanca->id,
            'tipo'             => TipoCategoria::Necessidade->value,
        ]);

        $this->assertSame(TipoCategoria::Poupanca, $renda->fresh()->tipo);
    }

    /** Editar a subcategoria também não consegue divergir. */
    public function test_editar_a_subcategoria_nao_muda_o_tipo(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        $aluguel = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Aluguel', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade',
        ]);

        $aluguel->update(['tipo' => TipoCategoria::Desejo->value, 'nome' => 'Aluguel do apê']);

        $this->assertSame(TipoCategoria::Necessidade, $aluguel->fresh()->tipo);
        $this->assertSame('Aluguel do apê', $aluguel->fresh()->nome);
    }

    /** Trocar o tipo da mãe reclassifica as filhas junto. */
    public function test_mudar_o_tipo_da_categoria_principal_reclassifica_as_filhas(): void
    {
        $saude = $this->principal('Saúde', TipoCategoria::Necessidade);

        foreach (['Academia', 'Consulta', 'Exames'] as $nome) {
            Categoria::withoutGlobalScopes()->create([
                'nome' => $nome, 'categoria_pai_id' => $saude->id, 'tipo' => 'necessidade',
            ]);
        }

        $saude->update(['tipo' => TipoCategoria::Desejo->value]);

        $tipos = Categoria::withoutGlobalScopes()
            ->where('categoria_pai_id', $saude->id)->pluck('tipo')->unique();

        $this->assertCount(1, $tipos);
        $this->assertSame('desejo', $tipos->first()->value);
    }

    /** Mover a subcategoria para outra mãe adota o tipo do novo pai. */
    public function test_mover_subcategoria_para_outra_mae_adota_o_novo_tipo(): void
    {
        $necessidade = $this->principal('Contas e serviços', TipoCategoria::Necessidade);
        $desejo = $this->principal('Entretenimento', TipoCategoria::Desejo);

        $item = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Streaming', 'categoria_pai_id' => $necessidade->id, 'tipo' => 'necessidade',
        ]);
        $this->assertSame(TipoCategoria::Necessidade, $item->fresh()->tipo);

        $item->update(['categoria_pai_id' => $desejo->id]);

        $this->assertSame(TipoCategoria::Desejo, $item->fresh()->tipo);
    }

    // ----------------------------------------------------------- raiz

    public function test_raiz_de_uma_principal_e_ela_mesma(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);

        $this->assertSame($moradia->id, $moradia->raizId());
        $this->assertTrue($moradia->ehPrincipal());
        $this->assertFalse($moradia->ehSubcategoria());
    }

    public function test_raiz_de_uma_subcategoria_e_a_mae(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        $aluguel = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Aluguel', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade',
        ]);

        $this->assertSame($moradia->id, $aluguel->raizId());
        $this->assertTrue($aluguel->ehSubcategoria());
    }

    /** A expressão SQL precisa dar o mesmo resultado do método PHP. */
    public function test_expressao_raiz_agrupa_como_o_metodo(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        $aluguel = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Aluguel', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade',
        ]);

        $raizes = Categoria::withoutGlobalScopes()
            ->selectRaw(Categoria::expressaoRaiz() . ' as raiz, id')
            ->get()->pluck('raiz', 'id');

        $this->assertEquals($moradia->id, $raizes[$moradia->id]);
        $this->assertEquals($moradia->id, $raizes[$aluguel->id]);
    }

    // ----------------------------------------------------------- relações

    public function test_relacoes_pai_e_filhas(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);

        foreach (['Aluguel', 'Condomínio', 'Água'] as $nome) {
            Categoria::withoutGlobalScopes()->create([
                'nome' => $nome, 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade',
            ]);
        }

        $this->assertCount(3, $moradia->fresh()->filhas);
        $this->assertSame(
            'Moradia',
            Categoria::withoutGlobalScopes()->where('nome', 'Aluguel')->first()->pai->nome
        );
    }

    public function test_escopos_principais_e_subcategorias(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        $transporte = $this->principal('Transporte', TipoCategoria::Necessidade);

        Categoria::withoutGlobalScopes()->create(['nome' => 'Aluguel', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade']);
        Categoria::withoutGlobalScopes()->create(['nome' => 'Combustível', 'categoria_pai_id' => $transporte->id, 'tipo' => 'necessidade']);

        $this->assertSame(2, Categoria::withoutGlobalScopes()->principais()->count());
        $this->assertSame(2, Categoria::withoutGlobalScopes()->subcategorias()->count());
        $this->assertSame(1, Categoria::withoutGlobalScopes()->subcategorias($moradia->id)->count());
    }

    // ----------------------------------------------- integridade referencial

    /** Apagar a mãe leva as filhas: FK com cascade. */
    public function test_excluir_a_mae_remove_as_filhas_no_banco(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        Categoria::withoutGlobalScopes()->create(['nome' => 'Aluguel', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade']);
        Categoria::withoutGlobalScopes()->create(['nome' => 'Água', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade']);

        $moradia->delete();

        $this->assertSame(0, Categoria::withoutGlobalScopes()->count());
    }

    /** Um lançamento aponta para a subcategoria diretamente. */
    public function test_gasto_pode_apontar_para_subcategoria(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        $aluguel = Categoria::withoutGlobalScopes()->create([
            'nome' => 'Aluguel', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade',
        ]);

        $gasto = Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $aluguel->id, 'valor' => 900,
        ]);

        $this->assertSame($aluguel->id, $gasto->categoria_id);
        $this->assertSame($moradia->id, $gasto->categoria->raizId());
    }

    /** E também para a categoria principal, sem inventar "Outros". */
    public function test_gasto_pode_apontar_direto_para_a_categoria_principal(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        Categoria::withoutGlobalScopes()->create(['nome' => 'Aluguel', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade']);

        $gasto = Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $moradia->id, 'valor' => 100,
        ]);

        $this->assertSame($moradia->id, $gasto->categoria->raizId());
    }

    // ------------------------------------------------------- unicidade

    /**
     * "Manutenção" é legítima em Moradia e em Transporte. O índice antigo,
     * plano por (user_id, nome), impedia isso.
     */
    public function test_mesmo_nome_de_subcategoria_em_maes_diferentes_convive(): void
    {
        $moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        $transporte = $this->principal('Transporte', TipoCategoria::Necessidade);

        Categoria::withoutGlobalScopes()->create(['nome' => 'Manutenção', 'categoria_pai_id' => $moradia->id, 'tipo' => 'necessidade']);
        Categoria::withoutGlobalScopes()->create(['nome' => 'Manutenção', 'categoria_pai_id' => $transporte->id, 'tipo' => 'necessidade']);

        $this->assertSame(2, Categoria::withoutGlobalScopes()->where('nome', 'Manutenção')->count());
    }
}
