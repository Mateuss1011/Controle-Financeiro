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

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    /** @var array<string, Categoria> */
    private array $categorias = [];

    protected function setUp(): void
    {
        parent::setUp();

        // Data fixa: "mês corrente" precisa ser previsível para os testes de
        // ritmo e de capacidade de gasto.
        Carbon::setTestNow('2026-09-15 12:00:00');

        $this->user = User::factory()->create();

        foreach (TipoCategoria::cases() as $tipo) {
            $this->categorias[$tipo->value] = Categoria::factory()
                ->doTipo($tipo)
                ->create(['user_id' => null, 'nome' => 'Cat ' . $tipo->value]);
        }
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function renda(float $valor, string $competencia = '2026-09'): Salario
    {
        return Salario::factory()->naCompetencia($competencia)->create([
            'user_id' => $this->user->id,
            'valor'   => $valor,
        ]);
    }

    private function gasto(TipoCategoria $tipo, float $valor, string $data = '2026-09-05'): Gasto
    {
        return Gasto::factory()->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $this->categorias[$tipo->value]->id,
            'valor'        => $valor,
            'data'         => $data,
        ]);
    }

    private function dashboard(?string $competencia = null): array
    {
        $url = '/api/dashboard' . ($competencia ? "?competencia={$competencia}" : '');

        return $this->actingAs($this->user)->getJson($url)->assertOk()->json('data');
    }

    // ------------------------------------------------------------- estrutura

    public function test_exige_autenticacao(): void
    {
        $this->getJson('/api/dashboard')->assertStatus(401);
    }

    public function test_recusa_competencia_em_formato_invalido(): void
    {
        $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=09-2026')
            ->assertStatus(422)
            ->assertJsonValidationErrors('competencia');
    }

    // --------------------------------------------------------- primeira sessão

    public function test_conta_nova_e_sinalizada_como_primeira_sessao(): void
    {
        $dados = $this->dashboard();

        $this->assertTrue($dados['primeira_sessao']);
        $this->assertFalse($dados['tem_dados']);
        $this->assertSame(0, $dados['total_lancamentos']);
        $this->assertFalse($dados['saude']['suficiente']);
    }

    public function test_conta_com_dados_nao_e_primeira_sessao(): void
    {
        $this->renda(5500);

        $this->assertFalse($this->dashboard()['primeira_sessao']);
    }

    // ------------------------------------------------------------- competência

    /** Resolve o cenário real: dados de dezembro, calendário em setembro. */
    public function test_sem_competencia_abre_no_periodo_mais_recente_com_dados(): void
    {
        $this->renda(2086.65, '2025-12');
        $this->gasto(TipoCategoria::Necessidade, 167.56, '2025-12-11');

        $dados = $this->dashboard();

        $this->assertSame('2025-12', $dados['competencia']);
        $this->assertTrue($dados['competencia_ajustada']);
        $this->assertSame('dezembro de 2025', $dados['competencia_rotulo']);
    }

    public function test_competencia_pedida_prevalece_sobre_a_mais_recente(): void
    {
        $this->renda(2086.65, '2025-12');
        $this->renda(5500, '2026-09');

        $dados = $this->dashboard('2026-09');

        $this->assertSame('2026-09', $dados['competencia']);
        $this->assertFalse($dados['competencia_ajustada']);
        $this->assertSame(5500.0, (float) $dados['resumo']['renda']);
    }

    public function test_competencia_sem_dados_devolve_estrutura_zerada_e_coerente(): void
    {
        $this->renda(5500, '2026-09');

        $dados = $this->dashboard('2026-03');

        $this->assertSame('2026-03', $dados['competencia']);
        $this->assertSame(0.0, (float) $dados['resumo']['renda']);
        $this->assertSame(0.0, (float) $dados['resumo']['gastos']);
        $this->assertFalse($dados['tem_dados']);
        $this->assertFalse($dados['saude']['suficiente']);
    }

    public function test_lista_as_competencias_que_possuem_dados(): void
    {
        $this->renda(1000, '2026-07');
        $this->renda(1000, '2026-08');
        $this->gasto(TipoCategoria::Desejo, 50, '2026-09-02');

        $competencias = $this->dashboard('2026-09')['competencias_com_dados'];

        $this->assertSame(['2026-09', '2026-08', '2026-07'], $competencias);
    }

    public function test_nao_mistura_dados_de_competencias_diferentes(): void
    {
        $this->renda(5500, '2026-09');
        $this->gasto(TipoCategoria::Necessidade, 100, '2026-09-10');
        $this->gasto(TipoCategoria::Necessidade, 900, '2026-08-10');

        $dados = $this->dashboard('2026-09');

        $this->assertSame(100.0, (float) $dados['resumo']['gastos']);
        $this->assertCount(1, $dados['ultimos_lancamentos']);
    }

    // ------------------------------------------------------------------ resumo

    public function test_resumo_calcula_renda_gastos_saldo_e_taxa_de_economia(): void
    {
        $this->renda(5000);
        $this->gasto(TipoCategoria::Necessidade, 2000);
        $this->gasto(TipoCategoria::Desejo, 1000);

        $resumo = $this->dashboard('2026-09')['resumo'];

        $this->assertSame(5000.0, (float) $resumo['renda']);
        $this->assertSame(3000.0, (float) $resumo['gastos']);
        $this->assertSame(2000.0, (float) $resumo['saldo']);
        $this->assertSame(40.0, (float) $resumo['taxa_economia']);
        $this->assertSame(60.0, (float) $resumo['percentual_renda_gasto']);
    }

    public function test_saldo_negativo_quando_gastos_superam_a_renda(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Desejo, 1500);

        $resumo = $this->dashboard('2026-09')['resumo'];

        $this->assertSame(-500.0, (float) $resumo['saldo']);
    }

    // ------------------------------------------------------ divisão por zero

    public function test_sem_renda_nenhum_percentual_vira_infinity_ou_nan(): void
    {
        $this->gasto(TipoCategoria::Necessidade, 500);

        $resposta = $this->actingAs($this->user)->getJson('/api/dashboard?competencia=2026-09');
        $conteudo = $resposta->getContent();

        $this->assertStringNotContainsString('Infinity', $conteudo);
        $this->assertStringNotContainsString('NaN', $conteudo);
        $this->assertStringNotContainsString('null,null', $conteudo);

        $dados = $resposta->json('data');
        $this->assertSame(0.0, (float) $dados['resumo']['taxa_economia']);
        $this->assertSame(0.0, (float) $dados['resumo']['percentual_renda_gasto']);

        foreach ($dados['regra']['faixas'] as $faixa) {
            $this->assertIsNumeric($faixa['percentual']);
            $this->assertSame(0.0, (float) $faixa['percentual']);
        }
    }

    // ---------------------------------------------------------------- 50/30/20

    public function test_regra_50_30_20_vem_do_backend_com_status_por_faixa(): void
    {
        $this->renda(5500);
        $this->gasto(TipoCategoria::Necessidade, 2100);
        $this->gasto(TipoCategoria::Desejo, 1800);
        $this->gasto(TipoCategoria::Poupanca, 1100);

        $faixas = collect($this->dashboard('2026-09')['regra']['faixas'])->keyBy('tipo');

        $this->assertSame(2750.0, (float) $faixas['necessidade']['limite']);
        $this->assertSame('dentro_do_limite', $faixas['necessidade']['status']);

        $this->assertSame(1650.0, (float) $faixas['desejo']['limite']);
        $this->assertSame('acima_do_limite', $faixas['desejo']['status']);
        $this->assertSame(-150.0, (float) $faixas['desejo']['diferenca']);

        $this->assertSame('meta_atingida', $faixas['poupanca']['status']);
    }

    // ---------------------------------------------------------------- saúde

    public function test_saude_exige_renda(): void
    {
        $this->gasto(TipoCategoria::Necessidade, 100);
        $this->gasto(TipoCategoria::Necessidade, 100);
        $this->gasto(TipoCategoria::Necessidade, 100);

        $saude = $this->dashboard('2026-09')['saude'];

        $this->assertFalse($saude['suficiente']);
        $this->assertNull($saude['pontuacao']);
        $this->assertSame('Dados insuficientes para calcular sua saúde financeira.', $saude['resumo']);
        $this->assertStringContainsString('renda', $saude['motivo']);
    }

    public function test_saude_exige_no_minimo_tres_lancamentos(): void
    {
        $this->renda(5000);
        $this->gasto(TipoCategoria::Necessidade, 100);
        $this->gasto(TipoCategoria::Necessidade, 100);

        $saude = $this->dashboard('2026-09')['saude'];

        $this->assertFalse($saude['suficiente']);
        $this->assertNull($saude['pontuacao']);
        $this->assertStringContainsString('3 lançamentos', $saude['motivo']);
    }

    public function test_saude_pontua_de_0_a_100_e_expoe_os_indicadores(): void
    {
        $this->renda(5000);
        $this->gasto(TipoCategoria::Necessidade, 2000);
        $this->gasto(TipoCategoria::Desejo, 1000);
        $this->gasto(TipoCategoria::Poupanca, 1000);

        $saude = $this->dashboard('2026-09')['saude'];

        $this->assertTrue($saude['suficiente']);
        $this->assertIsInt($saude['pontuacao']);
        $this->assertGreaterThanOrEqual(0, $saude['pontuacao']);
        $this->assertLessThanOrEqual(100, $saude['pontuacao']);
        $this->assertCount(4, $saude['indicadores']);
        $this->assertNotNull($saude['metodologia']);

        $chaves = array_column($saude['indicadores'], 'chave');
        $this->assertSame(['poupanca', 'margem', 'necessidades', 'desejos'], $chaves);
    }

    /** Cenário exemplar: 20% guardados, 20% de margem, faixas dentro do teto. */
    public function test_cenario_exemplar_atinge_a_faixa_excelente(): void
    {
        $this->renda(5000);
        $this->gasto(TipoCategoria::Necessidade, 2000); // 40% — dentro de 50%
        $this->gasto(TipoCategoria::Desejo, 1000);      // 20% — dentro de 30%
        $this->gasto(TipoCategoria::Poupanca, 1000);    // 20% — meta cheia

        $saude = $this->dashboard('2026-09')['saude'];

        $this->assertSame(100, $saude['pontuacao']);
        $this->assertSame('excelente', $saude['classificacao']);
        $this->assertSame('Excelente', $saude['rotulo']);
    }

    public function test_cenario_ruim_cai_para_a_faixa_critica(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Necessidade, 900);
        $this->gasto(TipoCategoria::Desejo, 600);
        $this->gasto(TipoCategoria::Desejo, 100);

        $saude = $this->dashboard('2026-09')['saude'];

        // Margem e poupança zeradas; desejos a 70% da renda zera o indicador;
        // necessidades a 90% ainda rende nota parcial pela interpolação. O que
        // importa é a faixa, não um valor exato.
        $this->assertLessThan(10, $saude['pontuacao']);
        $this->assertSame('critica', $saude['classificacao']);

        $indicadores = collect($saude['indicadores'])->keyBy('chave');
        $this->assertSame(0.0, (float) $indicadores['margem']['pontos']);
        $this->assertSame(0.0, (float) $indicadores['poupanca']['pontos']);
        $this->assertSame(0.0, (float) $indicadores['desejos']['pontos']);
    }

    public function test_pontuacao_nunca_escapa_do_intervalo_mesmo_com_valores_extremos(): void
    {
        $this->renda(100);
        $this->gasto(TipoCategoria::Poupanca, 5000);
        $this->gasto(TipoCategoria::Poupanca, 5000);
        $this->gasto(TipoCategoria::Poupanca, 5000);

        $saude = $this->dashboard('2026-09')['saude'];

        $this->assertGreaterThanOrEqual(0, $saude['pontuacao']);
        $this->assertLessThanOrEqual(100, $saude['pontuacao']);
    }

    // ------------------------------------------------------------ capacidade

    public function test_capacidade_estima_gasto_diario_reservando_a_poupanca(): void
    {
        // Setembro tem 30 dias; "hoje" é 15 => 15 dias restantes.
        $this->renda(3000);
        $this->gasto(TipoCategoria::Necessidade, 1000, '2026-09-02');

        $capacidade = $this->dashboard('2026-09')['capacidade'];

        $this->assertTrue($capacidade['disponivel']);
        $this->assertSame(600.0, (float) $capacidade['reservado_poupanca']); // 20% de 3000
        $this->assertSame(1400.0, (float) $capacidade['valor_disponivel']);  // 3000 - 1000 - 600
        $this->assertSame(15, $capacidade['dias_restantes']);
        $this->assertSame(93.33, (float) $capacidade['por_dia']);
        $this->assertStringContainsString('Não é recomendação financeira', $capacidade['ressalva']);
    }

    public function test_capacidade_desconta_a_poupanca_ja_feita(): void
    {
        $this->renda(3000);
        $this->gasto(TipoCategoria::Poupanca, 600, '2026-09-02');

        $capacidade = $this->dashboard('2026-09')['capacidade'];

        $this->assertSame(0.0, (float) $capacidade['reservado_poupanca']);
        $this->assertSame(2400.0, (float) $capacidade['valor_disponivel']);
    }

    public function test_capacidade_sem_renda_explica_o_motivo_em_vez_de_sugerir_zero(): void
    {
        $capacidade = $this->dashboard('2026-09')['capacidade'];

        $this->assertFalse($capacidade['disponivel']);
        $this->assertSame('sem_renda', $capacidade['motivo']);
        $this->assertNull($capacidade['por_dia']);
        $this->assertStringContainsString('Cadastre a renda', $capacidade['mensagem']);
    }

    public function test_capacidade_avisa_quando_nao_ha_folga(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Necessidade, 1000, '2026-09-02');

        $capacidade = $this->dashboard('2026-09')['capacidade'];

        $this->assertFalse($capacidade['disponivel']);
        $this->assertSame('sem_folga', $capacidade['motivo']);
        $this->assertNull($capacidade['por_dia']);
    }

    public function test_capacidade_nao_estima_para_periodo_encerrado(): void
    {
        $this->renda(3000, '2026-08');

        $capacidade = $this->dashboard('2026-08')['capacidade'];

        $this->assertFalse($capacidade['disponivel']);
        $this->assertSame('periodo_encerrado', $capacidade['motivo']);
    }

    // ----------------------------------------------------------------- ritmo

    public function test_ritmo_detecta_gasto_acelerado(): void
    {
        // 15 de 30 dias => 50% do mês; 72% da renda gasta.
        $this->renda(1000);
        $this->gasto(TipoCategoria::Necessidade, 720, '2026-09-03');

        $ritmo = $this->dashboard('2026-09')['ritmo'];

        $this->assertTrue($ritmo['disponivel']);
        $this->assertSame(72.0, (float) $ritmo['percentual_gasto']);
        $this->assertSame(50.0, (float) $ritmo['percentual_periodo']);
        $this->assertSame('acelerado', $ritmo['status']);
    }

    public function test_ritmo_equilibrado_quando_gasto_acompanha_o_mes(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Necessidade, 500, '2026-09-03');

        $this->assertSame('equilibrado', $this->dashboard('2026-09')['ritmo']['status']);
    }

    public function test_ritmo_nao_se_aplica_a_periodo_encerrado(): void
    {
        $this->renda(1000, '2026-08');
        $this->gasto(TipoCategoria::Necessidade, 500, '2026-08-03');

        $ritmo = $this->dashboard('2026-08')['ritmo'];

        $this->assertFalse($ritmo['disponivel']);
        $this->assertSame('periodo_nao_corrente', $ritmo['motivo']);
    }

    // ------------------------------------------------------------- comparação

    public function test_comparacao_indisponivel_sem_periodo_anterior(): void
    {
        $this->renda(5000);

        $comparacao = $this->dashboard('2026-09')['comparacao'];

        $this->assertFalse($comparacao['disponivel']);
        $this->assertSame('sem_periodo_anterior', $comparacao['motivo']);
    }

    public function test_comparacao_calcula_variacoes_quando_ha_base(): void
    {
        $this->renda(5000, '2026-08');
        $this->gasto(TipoCategoria::Necessidade, 2000, '2026-08-10');

        $this->renda(5000, '2026-09');
        $this->gasto(TipoCategoria::Necessidade, 1000, '2026-09-10');

        $comparacao = $this->dashboard('2026-09')['comparacao'];

        $this->assertTrue($comparacao['disponivel']);
        $this->assertSame('2026-08', $comparacao['competencia_anterior']);
        $this->assertSame(-50.0, (float) $comparacao['gastos']['variacao_percentual']);
        $this->assertSame(-1000.0, (float) $comparacao['gastos']['variacao_absoluta']);
        // 60% -> 80% de taxa de economia = +20 pontos percentuais.
        $this->assertSame(20.0, (float) $comparacao['taxa_economia']['variacao_pontos']);
        $this->assertNull($comparacao['taxa_economia']['variacao_percentual']);
    }

    public function test_comparacao_nao_gera_percentual_sobre_base_zero(): void
    {
        $this->renda(1000, '2026-08');
        $this->renda(1000, '2026-09');
        $this->gasto(TipoCategoria::Desejo, 300, '2026-09-10');

        $gastos = $this->dashboard('2026-09')['comparacao']['gastos'];

        $this->assertSame(0.0, (float) $gastos['anterior']);
        $this->assertNull($gastos['variacao_percentual']);
        $this->assertSame(300.0, (float) $gastos['variacao_absoluta']);
    }

    // -------------------------------------------------------------- insights

    public function test_insights_alertam_sobre_renda_ausente(): void
    {
        $tipos = array_column($this->dashboard('2026-09')['insights'], 'tipo');

        $this->assertContains('sem_renda', $tipos);
    }

    public function test_insights_alertam_sobre_faixa_estourada(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Desejo, 500);

        $insights = collect($this->dashboard('2026-09')['insights'])->keyBy('tipo');

        $this->assertArrayHasKey('faixa_estourada', $insights);
        $this->assertSame('critico', $insights['faixa_estourada']['severidade']);
        $this->assertSame(200.0, (float) $insights['faixa_estourada']['contexto']['excedente']);
    }

    public function test_insights_alertam_sobre_saldo_negativo(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Necessidade, 1500);

        $tipos = array_column($this->dashboard('2026-09')['insights'], 'tipo');

        $this->assertContains('saldo_negativo', $tipos);
    }

    public function test_insights_reconhecem_meta_de_poupanca_atingida(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Poupanca, 200);

        $insights = collect($this->dashboard('2026-09')['insights'])->keyBy('tipo');

        $this->assertArrayHasKey('meta_poupanca', $insights);
        $this->assertSame('positivo', $insights['meta_poupanca']['severidade']);
    }

    public function test_insights_apontam_concentracao_excessiva(): void
    {
        $this->renda(5000);
        $this->gasto(TipoCategoria::Necessidade, 1000);
        $this->gasto(TipoCategoria::Desejo, 100);

        $insights = collect($this->dashboard('2026-09')['insights'])->keyBy('tipo');

        $this->assertArrayHasKey('concentracao', $insights);
        $this->assertGreaterThan(40, $insights['concentracao']['contexto']['percentual']);
    }

    public function test_insights_sao_limitados_e_ordenados_por_gravidade(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Necessidade, 900, '2026-09-02');
        $this->gasto(TipoCategoria::Desejo, 500, '2026-09-03');
        $this->gasto(TipoCategoria::Desejo, 200, '2026-09-04');

        $insights = $this->dashboard('2026-09')['insights'];

        $this->assertLessThanOrEqual(4, count($insights));
        $this->assertNotEmpty($insights);
        $this->assertSame('critico', $insights[0]['severidade']);

        foreach ($insights as $insight) {
            $this->assertArrayHasKey('tipo', $insight);
            $this->assertArrayHasKey('titulo', $insight);
            $this->assertArrayHasKey('mensagem', $insight);
            $this->assertArrayHasKey('severidade', $insight);
            $this->assertArrayHasKey('contexto', $insight);
        }
    }

    // ----------------------------------------------------------- lançamentos

    public function test_ultimos_lancamentos_vem_ordenados_e_limitados(): void
    {
        foreach (range(1, 8) as $dia) {
            $this->gasto(TipoCategoria::Necessidade, 10 * $dia, sprintf('2026-09-%02d', $dia));
        }

        $ultimos = $this->dashboard('2026-09')['ultimos_lancamentos'];

        $this->assertCount(5, $ultimos);
        $this->assertSame('2026-09-08', $ultimos[0]['data_lancamento']);
        $this->assertArrayHasKey('categoria', $ultimos[0]);
        $this->assertArrayHasKey('tipo', $ultimos[0]['categoria']);
    }

    public function test_categorias_vem_ordenadas_por_valor_com_percentual(): void
    {
        $this->renda(1000);
        $this->gasto(TipoCategoria::Necessidade, 300);
        $this->gasto(TipoCategoria::Desejo, 700);

        $categorias = $this->dashboard('2026-09')['categorias'];

        $this->assertSame(700.0, (float) $categorias[0]['total']);
        $this->assertSame(70.0, (float) $categorias[0]['percentual']);
        $this->assertSame('desejo', $categorias[0]['tipo']);
    }

    // ------------------------------------------------------------ isolamento

    public function test_dashboard_de_a_nao_enxerga_dado_de_b(): void
    {
        $outro = User::factory()->create();

        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $outro->id, 'valor' => 99999,
        ]);
        Gasto::factory()->create([
            'user_id'      => $outro->id,
            'categoria_id' => $this->categorias['desejo']->id,
            'valor'        => 5000,
            'data'         => '2026-09-10',
        ]);

        $dados = $this->dashboard('2026-09');

        $this->assertSame(0.0, (float) $dados['resumo']['renda']);
        $this->assertSame(0.0, (float) $dados['resumo']['gastos']);
        $this->assertSame(0, $dados['total_lancamentos']);
        $this->assertEmpty($dados['ultimos_lancamentos']);
        $this->assertEmpty($dados['competencias_com_dados']);
    }
}
