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

/**
 * O gasto na subcategoria soma na categoria mãe. Em todo lugar.
 *
 * Este é o ponto em que a hierarquia podia quebrar o produto em silêncio. Se
 * "Moradia › Aluguel" não somasse em Moradia, o orçamento de Moradia ficaria
 * eternamente zerado, o donut do Dashboard viraria trinta fatias e o ranking
 * do relatório listaria linhas que respondem à mesma pergunta.
 *
 * O cenário abaixo é o que você descreveu ao aprovar a arquitetura:
 *
 *   Orçamento Moradia = R$ 1.500
 *   Moradia › Aluguel         R$ 900
 *   Moradia › Energia         R$ 150
 *   Moradia (direto)          R$ 100
 *   -----------------------------------
 *   consumo 1.150, saldo 350
 */
class AgregacaoPorRaizTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Categoria $moradia;
    private Categoria $aluguel;
    private Categoria $energia;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-09-15 12:00:00');

        $this->user = User::factory()->create();

        $this->moradia = $this->principal('Moradia', TipoCategoria::Necessidade);
        $this->aluguel = $this->sub('Aluguel', $this->moradia);
        $this->energia = $this->sub('Energia elétrica', $this->moradia);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function principal(string $nome, TipoCategoria $tipo): Categoria
    {
        return Categoria::withoutGlobalScopes()->create([
            'nome' => $nome, 'tipo' => $tipo->value, 'user_id' => null,
        ]);
    }

    private function sub(string $nome, Categoria $pai): Categoria
    {
        return Categoria::withoutGlobalScopes()->create([
            'nome' => $nome, 'categoria_pai_id' => $pai->id, 'tipo' => $pai->tipo->value, 'user_id' => null,
        ]);
    }

    private function gasto(Categoria $categoria, float $valor, string $data = '2026-09-10'): Gasto
    {
        return Gasto::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $categoria->id,
            'valor' => $valor, 'data' => $data,
        ]);
    }

    private function renda(float $valor = 5000, string $competencia = '2026-09-01'): void
    {
        Salario::factory()->create([
            'user_id' => $this->user->id, 'valor' => $valor, 'competencia' => $competencia,
        ]);
    }

    private function assertValor(float $esperado, mixed $atual, string $campo = ''): void
    {
        $this->assertEqualsWithDelta($esperado, (float) $atual, 0.001, $campo);
    }

    /** O cenário aprovado, montado uma vez só. */
    private function cenarioDaAprovacao(): void
    {
        $this->renda();
        $this->gasto($this->aluguel, 900);
        $this->gasto($this->energia, 150);
        $this->gasto($this->moradia, 100);
    }

    // ---------------------------------------------------------- ORÇAMENTO

    public function test_orcamento_da_mae_consome_os_gastos_das_filhas(): void
    {
        $this->cenarioDaAprovacao();
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->moradia->id,
            'valor_limite' => 1500, 'competencia' => null,
        ]);

        $item = collect($this->actingAs($this->user)
            ->getJson('/api/orcamentos?competencia=2026-09')->assertOk()->json('data'))
            ->firstWhere('categoria_id', $this->moradia->id);

        $this->assertNotNull($item, 'o orçamento de Moradia deveria estar na lista');
        $this->assertValor(1500, $item['limite'], 'limite');
        $this->assertValor(1150, $item['gasto'], 'consumo (900 + 150 + 100)');
        $this->assertValor(350, $item['restante'], 'saldo');
    }

    /** Só gasto direto na mãe: continua funcionando como antes da hierarquia. */
    public function test_orcamento_com_gasto_apenas_direto_na_mae(): void
    {
        $this->renda();
        $this->gasto($this->moradia, 400);
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->moradia->id,
            'valor_limite' => 1000, 'competencia' => null,
        ]);

        $item = collect($this->actingAs($this->user)
            ->getJson('/api/orcamentos?competencia=2026-09')->json('data'))
            ->firstWhere('categoria_id', $this->moradia->id);

        $this->assertValor(400, $item['gasto'], 'consumo');
        $this->assertValor(600, $item['restante'], 'saldo');
    }

    /** Só gastos em filhas: o caso que ficaria zerado sem a agregação. */
    public function test_orcamento_com_gasto_apenas_nas_filhas(): void
    {
        $this->renda();
        $this->gasto($this->aluguel, 900);
        $this->gasto($this->energia, 150);
        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->moradia->id,
            'valor_limite' => 1000, 'competencia' => null,
        ]);

        $item = collect($this->actingAs($this->user)
            ->getJson('/api/orcamentos?competencia=2026-09')->json('data'))
            ->firstWhere('categoria_id', $this->moradia->id);

        $this->assertValor(1050, $item['gasto'], 'consumo');
        $this->assertValor(-50, $item['restante'], 'saldo negativo');
        $this->assertSame('estourado', $item['status']);
    }

    /** O orçamento de uma categoria não é afetado pelas filhas de outra. */
    public function test_orcamento_nao_mistura_arvores_diferentes(): void
    {
        $this->renda();
        $transporte = $this->principal('Transporte', TipoCategoria::Necessidade);
        $combustivel = $this->sub('Combustível', $transporte);

        $this->gasto($this->aluguel, 900);
        $this->gasto($combustivel, 300);

        Orcamento::factory()->create(['user_id' => $this->user->id, 'categoria_id' => $this->moradia->id, 'valor_limite' => 1000, 'competencia' => null]);
        Orcamento::factory()->create(['user_id' => $this->user->id, 'categoria_id' => $transporte->id, 'valor_limite' => 500, 'competencia' => null]);

        $itens = collect($this->actingAs($this->user)
            ->getJson('/api/orcamentos?competencia=2026-09')->json('data'))
            ->keyBy('categoria_id');

        $this->assertValor(900, $itens[$this->moradia->id]['gasto'], 'Moradia');
        $this->assertValor(300, $itens[$transporte->id]['gasto'], 'Transporte');
    }

    // ---------------------------------------------------------- DASHBOARD

    public function test_dashboard_agrupa_o_donut_pela_categoria_mae(): void
    {
        $this->cenarioDaAprovacao();

        $categorias = $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->assertOk()
            ->json('data.categorias');

        // Uma fatia, não três.
        $this->assertCount(1, $categorias);
        $this->assertSame('Moradia', $categorias[0]['categoria']);
        $this->assertSame($this->moradia->id, $categorias[0]['categoria_id']);
        $this->assertValor(1150, $categorias[0]['total'], 'total da fatia');
        $this->assertSame('necessidade', $categorias[0]['tipo']);
    }

    public function test_dashboard_separa_arvores_diferentes(): void
    {
        $this->renda();
        $lazer = $this->principal('Lazer', TipoCategoria::Desejo);
        $cinema = $this->sub('Cinema', $lazer);

        $this->gasto($this->aluguel, 900);
        $this->gasto($cinema, 100);

        $categorias = collect($this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data.categorias'))
            ->keyBy('categoria');

        $this->assertCount(2, $categorias);
        $this->assertValor(900, $categorias['Moradia']['total']);
        $this->assertValor(100, $categorias['Lazer']['total']);
        $this->assertSame('desejo', $categorias['Lazer']['tipo']);
    }

    // ------------------------------------------------- REGRA 50/30/20

    /**
     * O tipo é herdado, então a faixa da regra continua certa sem nenhuma
     * mudança no cálculo — mas isso precisa ser provado, não presumido.
     */
    public function test_regra_50_30_20_classifica_gasto_de_subcategoria_pela_faixa_da_mae(): void
    {
        $this->renda(5000);

        $lazer = $this->principal('Lazer', TipoCategoria::Desejo);
        $investimentos = $this->principal('Investimentos', TipoCategoria::Poupanca);

        $this->gasto($this->aluguel, 900);                       // necessidade, via filha
        $this->gasto($this->sub('Cinema', $lazer), 200);         // desejo, via filha
        $this->gasto($this->sub('Renda fixa', $investimentos), 500); // poupança, via filha
        $this->gasto($this->moradia, 100);                       // necessidade, direto

        $faixas = collect($this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data.regra.faixas'))
            ->keyBy('tipo');

        $this->assertValor(1000, $faixas['necessidade']['gasto'], 'necessidades');
        $this->assertValor(200, $faixas['desejo']['gasto'], 'desejos');
        $this->assertValor(500, $faixas['poupanca']['gasto'], 'poupança');

        // Os limites saem da renda e não mudaram.
        $this->assertValor(2500, $faixas['necessidade']['limite']);
        $this->assertValor(1500, $faixas['desejo']['limite']);
        $this->assertValor(1000, $faixas['poupanca']['limite']);
    }

    /** Mudar o tipo da mãe reclassifica o histórico das filhas na regra. */
    public function test_mudar_o_tipo_da_mae_move_os_gastos_das_filhas_de_faixa(): void
    {
        $this->renda(5000);
        $this->gasto($this->aluguel, 900);

        $faixas = collect($this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data.regra.faixas'))->keyBy('tipo');
        $this->assertValor(900, $faixas['necessidade']['gasto']);

        $this->moradia->update(['tipo' => TipoCategoria::Desejo->value]);

        $faixas = collect($this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data.regra.faixas'))->keyBy('tipo');
        $this->assertValor(0, $faixas['necessidade']['gasto'], 'saiu de necessidades');
        $this->assertValor(900, $faixas['desejo']['gasto'], 'entrou em desejos');
    }

    // ------------------------------------- SAÚDE E CAPACIDADE DE GASTO

    /** Ambas leem `totaisPorTipo`; o que se prova aqui é que a base delas fecha. */
    public function test_saude_e_capacidade_enxergam_os_gastos_das_filhas(): void
    {
        $this->renda(5000);
        $investimentos = $this->principal('Investimentos', TipoCategoria::Poupanca);

        // Três lançamentos, todos em SUBCATEGORIAS: a saúde financeira exige
        // renda e ao menos três lançamentos para ter base (regra da Fase E), e
        // aqui ela precisa alcançar esse mínimo enxergando só as filhas.
        $this->gasto($this->aluguel, 700);
        $this->gasto($this->energia, 300);
        $this->gasto($this->sub('Renda fixa', $investimentos), 1000);

        $dados = $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data');

        // Gastos totais entram no resumo.
        $this->assertValor(2000, $dados['resumo']['gastos'], 'gastos do período');

        // A poupança de R$ 1.000 já cumpre os 20% da regra, então a reserva
        // aplicada zera — prova de que o gasto na filha chegou ao cálculo.
        $this->assertValor(1000, $dados['capacidade']['reserva']['poupanca_feita'], 'poupança feita');
        $this->assertValor(0, $dados['capacidade']['reserva']['pela_regra'], 'reserva restante');

        $this->assertTrue($dados['saude']['suficiente'], 'saúde deveria ter base');
    }

    // ---------------------------------------------------------- RELATÓRIOS

    public function test_relatorio_agrupa_o_ranking_pela_categoria_mae(): void
    {
        $this->cenarioDaAprovacao();

        $categorias = $this->actingAs($this->user)
            ->getJson('/api/relatorios?de=2026-09&ate=2026-09')->assertOk()
            ->json('data.por_categoria');

        $this->assertCount(1, $categorias);
        $this->assertSame('Moradia', $categorias[0]['categoria']);
        $this->assertSame($this->moradia->id, $categorias[0]['categoria_id']);
        $this->assertValor(1150, $categorias[0]['total'], 'total');
        $this->assertSame(3, $categorias[0]['lancamentos'], 'conta os três lançamentos');
    }

    public function test_relatorio_mantem_a_composicao_por_faixa_com_subcategorias(): void
    {
        $this->renda(5000);
        $lazer = $this->principal('Lazer', TipoCategoria::Desejo);

        $this->gasto($this->aluguel, 900);
        $this->gasto($this->sub('Cinema', $lazer), 300);

        $porTipo = collect($this->actingAs($this->user)
            ->getJson('/api/relatorios?de=2026-09&ate=2026-09')->json('data.por_tipo'))
            ->keyBy('tipo');

        $this->assertValor(900, $porTipo['necessidade']['total']);
        $this->assertValor(300, $porTipo['desejo']['total']);
        $this->assertValor(1200, $this->actingAs($this->user)
            ->getJson('/api/relatorios?de=2026-09&ate=2026-09')->json('data.totais.gastos'));
    }

    public function test_relatorio_conta_lancamentos_de_mae_e_filhas_juntos(): void
    {
        $this->renda();
        $this->gasto($this->moradia, 100);
        $this->gasto($this->aluguel, 900);
        $this->gasto($this->aluguel, 50);
        $this->gasto($this->energia, 150);

        $categorias = $this->actingAs($this->user)
            ->getJson('/api/relatorios?de=2026-09&ate=2026-09')->json('data.por_categoria');

        $this->assertCount(1, $categorias);
        $this->assertSame(4, $categorias[0]['lancamentos']);
        $this->assertValor(1200, $categorias[0]['total']);
    }

    // --------------------------------------------------------- isolamento

    public function test_agregacao_nao_soma_gastos_de_outro_usuario(): void
    {
        $this->renda();
        $this->gasto($this->aluguel, 900);

        $outro = User::factory()->create();
        Gasto::factory()->create([
            'user_id' => $outro->id, 'categoria_id' => $this->aluguel->id,
            'valor' => 50000, 'data' => '2026-09-10',
        ]);

        Orcamento::factory()->create([
            'user_id' => $this->user->id, 'categoria_id' => $this->moradia->id,
            'valor_limite' => 1000, 'competencia' => null,
        ]);

        $item = collect($this->actingAs($this->user)
            ->getJson('/api/orcamentos?competencia=2026-09')->json('data'))
            ->firstWhere('categoria_id', $this->moradia->id);

        $this->assertValor(900, $item['gasto'], 'orçamento só do próprio usuário');

        $categorias = $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')->json('data.categorias');
        $this->assertValor(900, $categorias[0]['total'], 'dashboard só do próprio usuário');
    }
}
