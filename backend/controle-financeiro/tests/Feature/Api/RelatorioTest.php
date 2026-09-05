<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Salario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class RelatorioTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Categoria $mercado;
    private Categoria $lazer;
    private Categoria $investimento;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-09-15 12:00:00');

        $this->user = User::factory()->create();

        $this->mercado = Categoria::factory()
            ->doTipo(TipoCategoria::Necessidade)
            ->create(['user_id' => null, 'nome' => 'Alimentação']);

        $this->lazer = Categoria::factory()
            ->doTipo(TipoCategoria::Desejo)
            ->create(['user_id' => null, 'nome' => 'Lazer']);

        $this->investimento = Categoria::factory()
            ->doTipo(TipoCategoria::Poupanca)
            ->create(['user_id' => null, 'nome' => 'Investimentos']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function renda(string $competencia, float $valor, ?User $dono = null): void
    {
        Salario::factory()->create([
            'user_id'     => ($dono ?? $this->user)->id,
            'valor'       => $valor,
            'competencia' => $competencia . '-01',
        ]);
    }

    private function gasto(Categoria $categoria, float $valor, string $data, ?User $dono = null): Gasto
    {
        return Gasto::factory()->create([
            'user_id'      => ($dono ?? $this->user)->id,
            'categoria_id' => $categoria->id,
            'valor'        => $valor,
            'data'         => $data,
        ]);
    }

    private function relatorio(?string $de = null, ?string $ate = null): array
    {
        $query = array_filter(['de' => $de, 'ate' => $ate]);
        $url = '/api/relatorios' . ($query ? '?' . http_build_query($query) : '');

        return $this->actingAs($this->user)->getJson($url)->assertOk()->json('data');
    }

    /** JSON não distingue 1000 de 1000.0; o que importa é o número. */
    private function assertValor(float $esperado, mixed $atual, string $campo = ''): void
    {
        $this->assertEqualsWithDelta($esperado, (float) $atual, 0.001, $campo);
    }

    /** Três meses seguidos com renda e gastos nas três faixas. */
    private function cenarioDeTresMeses(): void
    {
        foreach (['2026-06', '2026-07', '2026-08'] as $competencia) {
            $this->renda($competencia, 4000);
        }

        $this->gasto($this->mercado, 1000, '2026-06-10');
        $this->gasto($this->lazer, 500, '2026-06-20');

        $this->gasto($this->mercado, 1200, '2026-07-10');
        $this->gasto($this->investimento, 800, '2026-07-25');

        $this->gasto($this->mercado, 900, '2026-08-05');
        $this->gasto($this->lazer, 300, '2026-08-15');
    }

    // ------------------------------------------------------------ intervalo

    public function test_exige_autenticacao(): void
    {
        $this->getJson('/api/relatorios')->assertUnauthorized();
    }

    public function test_rejeita_periodo_em_formato_invalido(): void
    {
        $this->actingAs($this->user)
            ->getJson('/api/relatorios?de=06/2026')
            ->assertStatus(422)
            ->assertJsonValidationErrors('de');

        $this->actingAs($this->user)
            ->getJson('/api/relatorios?ate=2026')
            ->assertStatus(422)
            ->assertJsonValidationErrors('ate');
    }

    public function test_respeita_o_intervalo_pedido(): void
    {
        $this->cenarioDeTresMeses();

        $dados = $this->relatorio('2026-07', '2026-08');

        $this->assertSame('2026-07', $dados['periodo']['de']);
        $this->assertSame('2026-08', $dados['periodo']['ate']);
        $this->assertSame(2, $dados['periodo']['meses']);
        $this->assertCount(2, $dados['evolucao']);
    }

    /** Datas invertidas são erro de digitação, não de intenção. */
    public function test_inverte_datas_trocadas_em_vez_de_recusar(): void
    {
        $this->cenarioDeTresMeses();

        $dados = $this->relatorio('2026-08', '2026-06');

        $this->assertSame('2026-06', $dados['periodo']['de']);
        $this->assertSame('2026-08', $dados['periodo']['ate']);
    }

    /**
     * Sem escolha, o relatório ancora no período mais recente COM DADOS. Quem
     * lançou tudo em dezembro e volta em setembro seguinte não pode receber
     * doze meses vazios.
     */
    public function test_sem_intervalo_ancora_no_periodo_mais_recente_com_dados(): void
    {
        $this->renda('2025-12', 2000);
        $this->gasto($this->mercado, 650, '2025-12-10');
        $this->gasto($this->lazer, 167, '2026-01-08');

        $dados = $this->relatorio();

        $this->assertSame('2026-01', $dados['periodo']['ate']);
        $this->assertSame('2025-12', $dados['periodo']['de']);
        $this->assertTrue($dados['periodo']['ajustado']);
        $this->assertTrue($dados['tem_dados']);
    }

    public function test_limita_a_janela_a_24_meses(): void
    {
        $this->renda('2026-08', 3000);

        $dados = $this->relatorio('2000-01', '2026-08');

        $this->assertSame(24, $dados['periodo']['meses']);
        $this->assertSame('2024-09', $dados['periodo']['de']);
        $this->assertCount(24, $dados['evolucao']);
    }

    /** Omitir mês vazio faria a linha de tendência mentir. */
    public function test_serie_mensal_e_contigua_incluindo_meses_vazios(): void
    {
        $this->renda('2026-06', 4000);
        $this->gasto($this->mercado, 500, '2026-06-10');
        $this->renda('2026-08', 4000);

        $dados = $this->relatorio('2026-06', '2026-08');

        $competencias = array_column($dados['evolucao'], 'competencia');
        $this->assertSame(['2026-06', '2026-07', '2026-08'], $competencias);

        $julho = $dados['evolucao'][1];
        $this->assertFalse($julho['tem_dados']);
        $this->assertValor(0, $julho['renda'], 'renda de julho');
        $this->assertValor(0, $julho['gastos'], 'gastos de julho');
        $this->assertValor(0, $julho['taxa_economia'], 'taxa de julho');
    }

    // -------------------------------------------------------------- números

    public function test_soma_renda_gastos_e_saldo_do_periodo(): void
    {
        $this->cenarioDeTresMeses();

        $totais = $this->relatorio('2026-06', '2026-08')['totais'];

        $this->assertValor(12000, $totais['renda'], 'renda');
        $this->assertValor(4700, $totais['gastos'], 'gastos');
        $this->assertValor(7300, $totais['saldo'], 'saldo');
        $this->assertSame(3, $totais['meses']);
        $this->assertSame(3, $totais['meses_com_renda']);
        $this->assertSame(3, $totais['meses_com_gastos']);
        $this->assertValor(4000, $totais['media_renda'], 'media_renda');
        $this->assertValor(1566.67, $totais['media_gastos'], 'media_gastos');
        $this->assertValor(60.8, $totais['taxa_economia'], 'taxa_economia');
    }

    /** A média divide pelos meses do intervalo: mês zerado é informação. */
    public function test_media_considera_os_meses_vazios_do_intervalo(): void
    {
        $this->renda('2026-06', 3000);
        $this->gasto($this->mercado, 600, '2026-06-10');

        $totais = $this->relatorio('2026-06', '2026-08')['totais'];

        $this->assertSame(3, $totais['meses']);
        $this->assertSame(1, $totais['meses_com_gastos']);
        $this->assertValor(200, $totais['media_gastos'], 'media_gastos');
    }

    public function test_evolucao_quebra_cada_mes_pelas_faixas_da_regra(): void
    {
        $this->cenarioDeTresMeses();

        $julho = $this->relatorio('2026-06', '2026-08')['evolucao'][1];

        $this->assertSame('2026-07', $julho['competencia']);
        $this->assertValor(1200, $julho['necessidade'], 'necessidade');
        $this->assertValor(0, $julho['desejo'], 'desejo');
        $this->assertValor(800, $julho['poupanca'], 'poupanca');
        $this->assertValor(2000, $julho['gastos'], 'gastos');
        $this->assertValor(2000, $julho['saldo'], 'saldo');
        $this->assertValor(50, $julho['taxa_economia'], 'taxa_economia');
    }

    public function test_ranking_de_categorias_com_percentual_e_media(): void
    {
        $this->cenarioDeTresMeses();

        $categorias = $this->relatorio('2026-06', '2026-08')['por_categoria'];

        $this->assertSame('Alimentação', $categorias[0]['categoria']);
        $this->assertValor(3100, $categorias[0]['total'], 'total');
        $this->assertSame(3, $categorias[0]['lancamentos']);
        $this->assertValor(66, $categorias[0]['percentual'], 'percentual');
        $this->assertValor(1033.33, $categorias[0]['media_mensal'], 'media_mensal');
        $this->assertSame('necessidade', $categorias[0]['tipo']);

        // Ordenado do maior para o menor.
        $totais = array_column($categorias, 'total');
        $this->assertSame($totais, array_reverse(array_reverse($totais)));
        $this->assertGreaterThanOrEqual($totais[1], $totais[0]);
    }

    public function test_composicao_50_30_20_do_periodo_inteiro(): void
    {
        $this->cenarioDeTresMeses();

        $porTipo = collect($this->relatorio('2026-06', '2026-08')['por_tipo'])
            ->keyBy('tipo');

        $this->assertValor(3100, $porTipo['necessidade']['total'], 'necessidade');
        $this->assertValor(6000, $porTipo['necessidade']['alvo'], 'alvo necessidade');
        $this->assertValor(2900, $porTipo['necessidade']['diferenca'], 'diferenca');

        $this->assertValor(800, $porTipo['desejo']['total'], 'desejo');
        $this->assertValor(3600, $porTipo['desejo']['alvo'], 'alvo desejo');

        $this->assertValor(800, $porTipo['poupanca']['total'], 'poupanca');
        $this->assertValor(2400, $porTipo['poupanca']['alvo'], 'alvo poupanca');
        $this->assertValor(33.3, $porTipo['poupanca']['percentual_alvo'], 'percentual_alvo');
    }

    public function test_destaques_do_periodo(): void
    {
        $this->cenarioDeTresMeses();

        $destaques = $this->relatorio('2026-06', '2026-08')['destaques'];

        $this->assertSame('2026-07', $destaques['mes_maior_gasto']['competencia']);
        $this->assertSame('2026-08', $destaques['mes_menor_gasto']['competencia']);
        $this->assertSame('2026-08', $destaques['mes_melhor_saldo']['competencia']);
        $this->assertSame('Alimentação', $destaques['categoria_lider']['categoria']);
        $this->assertValor(1200, $destaques['maior_lancamento']['valor'], 'maior lançamento');
        $this->assertSame('Alimentação', $destaques['maior_lancamento']['categoria']);
    }

    /** Um único mês não tem "maior e menor": seria o mesmo mês duas vezes. */
    public function test_nao_repete_o_mesmo_mes_como_maior_e_menor(): void
    {
        $this->renda('2026-08', 3000);
        $this->gasto($this->mercado, 500, '2026-08-10');

        $destaques = $this->relatorio('2026-08', '2026-08')['destaques'];

        $this->assertSame('2026-08', $destaques['mes_maior_gasto']['competencia']);
        $this->assertNull($destaques['mes_menor_gasto']);
    }

    // ---------------------------------------------- ausência de base e bordas

    public function test_periodo_sem_dado_nenhum_nao_inventa_numeros(): void
    {
        $dados = $this->relatorio('2026-01', '2026-03');

        $this->assertFalse($dados['tem_dados']);
        $this->assertValor(0, $dados['totais']['renda'], 'renda');
        $this->assertValor(0, $dados['totais']['gastos'], 'gastos');
        $this->assertValor(0, $dados['totais']['taxa_economia'], 'taxa_economia');
        $this->assertValor(0, $dados['totais']['media_gastos'], 'media_gastos');
        $this->assertSame([], $dados['por_categoria']);
        $this->assertNull($dados['destaques']['mes_maior_gasto']);
        $this->assertNull($dados['destaques']['maior_lancamento']);
        $this->assertNull($dados['destaques']['categoria_lider']);
    }

    /** Gasto sem renda nenhuma no período: nada de INF nem NAN. */
    public function test_gasto_sem_renda_nao_gera_infinity_nem_nan(): void
    {
        $this->gasto($this->mercado, 800, '2026-08-10');

        $dados = $this->relatorio('2026-08', '2026-08');

        $json = json_encode($dados);
        $this->assertStringNotContainsString('Infinity', $json);
        $this->assertStringNotContainsString('NaN', $json);
        $this->assertStringNotContainsString('null,null', $json);

        $this->assertValor(0, $dados['totais']['taxa_economia'], 'taxa_economia');
        $this->assertValor(-800, $dados['totais']['saldo'], 'saldo');
        $this->assertValor(100, $dados['por_categoria'][0]['percentual'], 'percentual');

        foreach ($dados['por_tipo'] as $faixa) {
            $this->assertValor(0, $faixa['alvo'], 'alvo ' . $faixa['tipo']);
            $this->assertValor(0, $faixa['percentual_alvo'], 'percentual_alvo ' . $faixa['tipo']);
        }
    }

    public function test_nenhum_campo_numerico_vem_nulo(): void
    {
        $this->cenarioDeTresMeses();

        $dados = $this->relatorio('2026-06', '2026-08');

        foreach ($dados['totais'] as $campo => $valor) {
            $this->assertNotNull($valor, "totais.{$campo}");
            $this->assertIsNumeric($valor, "totais.{$campo}");
        }

        foreach ($dados['evolucao'] as $mes) {
            foreach (['renda', 'gastos', 'saldo', 'taxa_economia', 'necessidade', 'desejo', 'poupanca'] as $campo) {
                $this->assertIsNumeric($mes[$campo], "evolucao.{$mes['competencia']}.{$campo}");
            }
        }
    }

    // ------------------------------------------------------------ isolamento

    public function test_relatorio_ignora_dados_de_outro_usuario(): void
    {
        $this->cenarioDeTresMeses();

        $outro = User::factory()->create();
        $this->renda('2026-07', 90000, $outro);
        $this->gasto($this->lazer, 50000, '2026-07-10', $outro);

        $dados = $this->relatorio('2026-06', '2026-08');

        $this->assertValor(12000, $dados['totais']['renda'], 'renda');
        $this->assertValor(4700, $dados['totais']['gastos'], 'gastos');

        foreach ($dados['por_categoria'] as $categoria) {
            $this->assertLessThan(50000, $categoria['total']);
        }
    }

    /**
     * Renda arquivada (soft delete) não pode voltar pelo relatório — foi
     * exatamente esse o bug que inflou a regra 50/30/20 na Fase B.
     */
    public function test_renda_arquivada_fica_fora_do_relatorio(): void
    {
        $this->renda('2026-08', 3000);

        Salario::withoutGlobalScope('doUsuario')
            ->where('user_id', $this->user->id)
            ->first()
            ->delete();

        $this->renda('2026-08', 2086.65);

        $totais = $this->relatorio('2026-08', '2026-08')['totais'];

        $this->assertValor(2086.65, $totais['renda'], 'renda');
    }

    public function test_lista_as_competencias_disponiveis_para_o_seletor(): void
    {
        $this->cenarioDeTresMeses();

        $dados = $this->relatorio('2026-06', '2026-08');

        $this->assertSame(['2026-08', '2026-07', '2026-06'], $dados['competencias_disponiveis']);
    }
}
