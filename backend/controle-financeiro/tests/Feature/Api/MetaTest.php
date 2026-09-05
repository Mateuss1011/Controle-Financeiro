<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Meta;
use App\Models\Salario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class MetaTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Data fixa: aporte mensal e "meses restantes" dependem de hoje.
        Carbon::setTestNow('2026-09-15 12:00:00');

        $this->user = User::factory()->create();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function criar(array $dados = []): array
    {
        return $this->actingAs($this->user)
            ->postJson('/api/metas', array_merge([
                'nome'           => 'Viagem',
                'valor_objetivo' => 6000,
            ], $dados))
            ->json('data');
    }

    /** JSON não distingue 1000 de 1000.0; o que importa é o número. */
    private function assertValor(float $esperado, mixed $atual, string $campo = ''): void
    {
        $this->assertEqualsWithDelta($esperado, (float) $atual, 0.001, $campo);
    }

    // ---------------------------------------------------------------- CRUD

    public function test_cria_meta_sem_prazo(): void
    {
        $resposta = $this->actingAs($this->user)->postJson('/api/metas', [
            'nome'           => 'Reserva de emergência',
            'valor_objetivo' => 10000,
        ]);

        $resposta->assertCreated()
            ->assertJsonPath('data.nome', 'Reserva de emergência')
            ->assertJsonPath('data.prazo', null)
            ->assertJsonPath('data.status', 'sem_prazo');

        $meta = $resposta->json('data');

        $this->assertValor(10000, $meta['valor_objetivo'], 'valor_objetivo');
        $this->assertValor(0, $meta['valor_atual'], 'valor_atual');
        $this->assertValor(10000, $meta['restante'], 'restante');
        $this->assertValor(0, $meta['percentual'], 'percentual');
        // Sem prazo não há urgência a inferir: nenhum compromisso mensal.
        $this->assertValor(0, $meta['aporte_mensal'], 'aporte_mensal');

        $this->assertDatabaseHas('metas', [
            'user_id' => $this->user->id,
            'nome'    => 'Reserva de emergência',
        ]);
    }

    public function test_lista_metas_com_resumo(): void
    {
        $this->criar(['nome' => 'Viagem', 'valor_objetivo' => 6000, 'valor_atual' => 1500]);
        $this->criar(['nome' => 'Notebook', 'valor_objetivo' => 4000]);

        $resposta = $this->actingAs($this->user)->getJson('/api/metas')->assertOk();

        $resposta->assertJsonCount(2, 'data')->assertJsonPath('resumo.quantidade', 2);

        $resumo = $resposta->json('resumo');

        $this->assertValor(10000, $resumo['total_objetivo'], 'total_objetivo');
        $this->assertValor(1500, $resumo['total_acumulado'], 'total_acumulado');
        $this->assertValor(8500, $resumo['total_restante'], 'total_restante');
    }

    public function test_edita_meta(): void
    {
        $meta = $this->criar();

        $atualizada = $this->actingAs($this->user)
            ->putJson("/api/metas/{$meta['id']}", ['nome' => 'Viagem ao Chile', 'valor_atual' => 2000])
            ->assertOk()
            ->assertJsonPath('data.nome', 'Viagem ao Chile')
            ->json('data');

        $this->assertValor(2000, $atualizada['valor_atual'], 'valor_atual');
        $this->assertValor(4000, $atualizada['restante'], 'restante');
        $this->assertValor(33.3, $atualizada['percentual'], 'percentual');
    }

    public function test_remove_prazo_de_uma_meta(): void
    {
        $meta = $this->criar(['prazo' => '2026-12-31']);
        $this->assertSame('em_andamento', $meta['status']);

        $semPrazo = $this->actingAs($this->user)
            ->putJson("/api/metas/{$meta['id']}", ['prazo' => null])
            ->assertOk()
            ->assertJsonPath('data.prazo', null)
            ->assertJsonPath('data.status', 'sem_prazo')
            ->json('data');

        $this->assertValor(0, $semPrazo['aporte_mensal'], 'aporte_mensal');
    }

    public function test_exclui_meta(): void
    {
        $meta = $this->criar();

        $this->actingAs($this->user)
            ->deleteJson("/api/metas/{$meta['id']}")
            ->assertOk();

        $this->assertDatabaseMissing('metas', ['id' => $meta['id']]);
    }

    // ------------------------------------------------------- aporte mensal

    public function test_aporte_mensal_divide_o_restante_pelos_meses_ate_o_prazo(): void
    {
        // Set/2026 até dez/2026 = 4 meses, contando o mês corrente.
        $meta = $this->criar([
            'valor_objetivo' => 6000,
            'valor_atual'    => 2000,
            'prazo'          => '2026-12-20',
        ]);

        $this->assertSame(4, $meta['meses_restantes']);
        $this->assertSame('em_andamento', $meta['status']);
        $this->assertValor(1000, $meta['aporte_mensal'], 'aporte_mensal');
    }

    public function test_meta_com_prazo_vencido_concentra_o_restante_no_mes_corrente(): void
    {
        $meta = Meta::factory()->create([
            'user_id'        => $this->user->id,
            'valor_objetivo' => 3000,
            'valor_atual'    => 500,
            'prazo'          => '2026-06-30',
        ]);

        $item = $this->actingAs($this->user)->getJson('/api/metas')->json('data.0');

        $this->assertSame($meta->id, $item['id']);
        $this->assertSame('vencida', $item['status']);
        // Divisor nunca é zero nem negativo: o que falta cai todo no mês atual.
        $this->assertValor(2500, $item['aporte_mensal'], 'aporte_mensal');
    }

    public function test_meta_concluida_nao_gera_aporte_e_registra_a_data(): void
    {
        $meta = $this->criar([
            'valor_objetivo' => 2000,
            'valor_atual'    => 2000,
            'prazo'          => '2026-12-31',
        ]);

        $this->assertSame('concluida', $meta['status']);
        $this->assertNotNull($meta['concluida_em']);
        $this->assertValor(0, $meta['aporte_mensal'], 'aporte_mensal');
        $this->assertValor(100, $meta['percentual'], 'percentual');
    }

    public function test_baixar_o_valor_desfaz_a_conclusao(): void
    {
        $meta = $this->criar(['valor_objetivo' => 2000, 'valor_atual' => 2000]);
        $this->assertNotNull($meta['concluida_em']);

        $atualizada = $this->actingAs($this->user)
            ->putJson("/api/metas/{$meta['id']}", ['valor_atual' => 1200])
            ->assertOk()
            ->json('data');

        $this->assertNull($atualizada['concluida_em']);
        $this->assertSame('sem_prazo', $atualizada['status']);
    }

    // ---------------------------------------------------------- validações

    public function test_rejeita_objetivo_zero_negativo_e_nao_numerico(): void
    {
        foreach ([0, -100, 'NaN', 'Infinity', 'abc'] as $valor) {
            $this->actingAs($this->user)
                ->postJson('/api/metas', ['nome' => 'X', 'valor_objetivo' => $valor])
                ->assertStatus(422)
                ->assertJsonValidationErrors('valor_objetivo');
        }
    }

    public function test_rejeita_valor_atual_negativo_ou_acima_do_objetivo(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/metas', ['nome' => 'X', 'valor_objetivo' => 100, 'valor_atual' => -1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('valor_atual');

        $this->actingAs($this->user)
            ->postJson('/api/metas', ['nome' => 'X', 'valor_objetivo' => 100, 'valor_atual' => 101])
            ->assertStatus(422)
            ->assertJsonValidationErrors('valor_atual');
    }

    public function test_rejeita_prazo_em_formato_invalido(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/metas', [
                'nome'           => 'X',
                'valor_objetivo' => 100,
                'prazo'          => '31/12/2026',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('prazo');
    }

    public function test_nome_e_obrigatorio(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/metas', ['valor_objetivo' => 100])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nome');
    }

    // ------------------------------------------------------------ isolamento

    public function test_rotas_de_metas_exigem_autenticacao(): void
    {
        $meta = Meta::factory()->create(['user_id' => $this->user->id]);

        $this->getJson('/api/metas')->assertUnauthorized();
        $this->postJson('/api/metas', [])->assertUnauthorized();
        $this->putJson("/api/metas/{$meta->id}", [])->assertUnauthorized();
        $this->deleteJson("/api/metas/{$meta->id}")->assertUnauthorized();
    }

    public function test_usuario_nao_ve_metas_de_outro(): void
    {
        $outro = User::factory()->create();
        Meta::factory()->create(['user_id' => $outro->id, 'nome' => 'Meta alheia']);

        $this->actingAs($this->user)
            ->getJson('/api/metas')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_usuario_nao_altera_nem_exclui_meta_de_outro(): void
    {
        $outro = User::factory()->create();
        $alheia = Meta::factory()->create(['user_id' => $outro->id, 'valor_objetivo' => 500]);

        // O escopo global já esconde o registro: 404, não 403 — não confirmamos
        // sequer que o id existe.
        $this->actingAs($this->user)
            ->putJson("/api/metas/{$alheia->id}", ['nome' => 'Invadida'])
            ->assertNotFound();

        $this->actingAs($this->user)
            ->deleteJson("/api/metas/{$alheia->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('metas', ['id' => $alheia->id, 'nome' => $alheia->nome]);
    }

    // -------------------------------------- integração com "posso gastar?"

    private function comRendaEGastos(float $renda = 5000, float $poupado = 0): void
    {
        Salario::factory()->create([
            'user_id'     => $this->user->id,
            'valor'       => $renda,
            'competencia' => '2026-09-01',
        ]);

        if ($poupado > 0) {
            $categoria = Categoria::factory()
                ->doTipo(TipoCategoria::Poupanca)
                ->create(['user_id' => null, 'nome' => 'Investimentos']);

            Gasto::factory()->create([
                'user_id'      => $this->user->id,
                'categoria_id' => $categoria->id,
                'valor'        => $poupado,
                'data'         => '2026-09-05',
            ]);
        }
    }

    private function capacidade(): array
    {
        return $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')
            ->assertOk()
            ->json('data.capacidade');
    }

    public function test_sem_metas_a_reserva_e_a_da_regra_50_30_20(): void
    {
        $this->comRendaEGastos(renda: 5000);

        $reserva = $this->capacidade()['reserva'];

        $this->assertValor(1000, $reserva['pela_regra'], 'pela_regra');
        $this->assertValor(0, $reserva['pelas_metas'], 'pelas_metas');
        $this->assertValor(1000, $reserva['aplicada'], 'aplicada');
        $this->assertFalse($reserva['metas_prevalecem']);
    }

    public function test_meta_com_prazo_curto_prevalece_sobre_a_regra_e_o_conflito_fica_visivel(): void
    {
        $this->comRendaEGastos(renda: 5000);

        // 6000 em 2 meses = 3000/mês, acima dos 20% (1000) da regra.
        Meta::factory()->create([
            'user_id'        => $this->user->id,
            'valor_objetivo' => 6000,
            'valor_atual'    => 0,
            'prazo'          => '2026-10-31',
        ]);

        $capacidade = $this->capacidade();
        $reserva = $capacidade['reserva'];

        $this->assertValor(1000, $reserva['pela_regra'], 'pela_regra');
        $this->assertValor(3000, $reserva['pelas_metas'], 'pelas_metas');
        // Reserva-se o MAIOR dos dois, nunca a soma: seria contar o mesmo
        // dinheiro duas vezes.
        $this->assertValor(3000, $reserva['aplicada'], 'aplicada');
        $this->assertTrue($reserva['metas_prevalecem']);
        $this->assertValor(2000, $capacidade['valor_disponivel'], 'valor_disponivel');
        $this->assertStringContainsString('metas', $capacidade['ressalva']);
    }

    public function test_meta_folgada_nao_reduz_a_reserva_da_regra(): void
    {
        $this->comRendaEGastos(renda: 5000);

        // 1200 em 12 meses = 100/mês, bem abaixo dos 20%.
        Meta::factory()->create([
            'user_id'        => $this->user->id,
            'valor_objetivo' => 1200,
            'valor_atual'    => 0,
            'prazo'          => '2027-08-31',
        ]);

        $reserva = $this->capacidade()['reserva'];

        $this->assertValor(1000, $reserva['pela_regra'], 'pela_regra');
        $this->assertValor(100, $reserva['pelas_metas'], 'pelas_metas');
        $this->assertValor(1000, $reserva['aplicada'], 'aplicada');
        $this->assertFalse($reserva['metas_prevalecem']);
    }

    public function test_o_que_ja_foi_poupado_abate_as_duas_reservas(): void
    {
        $this->comRendaEGastos(renda: 5000, poupado: 800);

        Meta::factory()->create([
            'user_id'        => $this->user->id,
            'valor_objetivo' => 2000,
            'valor_atual'    => 0,
            'prazo'          => '2026-10-31',
        ]);

        $reserva = $this->capacidade()['reserva'];

        $this->assertValor(1000, $reserva['meta_regra'], 'meta_regra');
        $this->assertValor(800, $reserva['poupanca_feita'], 'poupanca_feita');
        $this->assertValor(200, $reserva['pela_regra'], 'pela_regra');
        // Compromisso das metas: 2000 / 2 meses = 1000, menos os 800 guardados.
        $this->assertValor(1000, $reserva['compromisso_metas'], 'compromisso_metas');
        $this->assertValor(200, $reserva['pelas_metas'], 'pelas_metas');
        $this->assertValor(200, $reserva['aplicada'], 'aplicada');
    }

    public function test_meta_sem_prazo_nao_altera_a_capacidade_de_gasto(): void
    {
        $this->comRendaEGastos(renda: 5000);

        Meta::factory()->create([
            'user_id'        => $this->user->id,
            'valor_objetivo' => 50000,
            'valor_atual'    => 0,
            'prazo'          => null,
        ]);

        $reserva = $this->capacidade()['reserva'];

        $this->assertValor(0, $reserva['compromisso_metas'], 'compromisso_metas');
        $this->assertValor(1000, $reserva['aplicada'], 'aplicada');
        $this->assertFalse($reserva['metas_prevalecem']);
    }

    public function test_metas_de_outro_usuario_nao_entram_na_capacidade(): void
    {
        $this->comRendaEGastos(renda: 5000);

        $outro = User::factory()->create();
        Meta::factory()->create([
            'user_id'        => $outro->id,
            'valor_objetivo' => 90000,
            'prazo'          => '2026-10-31',
        ]);

        $reserva = $this->capacidade()['reserva'];

        $this->assertValor(0, $reserva['compromisso_metas'], 'compromisso_metas');
        $this->assertValor(1000, $reserva['aplicada'], 'aplicada');
    }

    public function test_dashboard_traz_as_metas_do_usuario(): void
    {
        $this->comRendaEGastos(renda: 5000);
        Meta::factory()->create(['user_id' => $this->user->id, 'nome' => 'Reserva']);

        $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')
            ->assertOk()
            ->assertJsonPath('data.metas.resumo.quantidade', 1)
            ->assertJsonPath('data.metas.itens.0.nome', 'Reserva');
    }

    public function test_insight_avisa_quando_as_metas_pedem_mais_que_a_regra(): void
    {
        $this->comRendaEGastos(renda: 5000);

        Meta::factory()->create([
            'user_id'        => $this->user->id,
            'valor_objetivo' => 6000,
            'prazo'          => '2026-10-31',
        ]);

        $insights = $this->actingAs($this->user)
            ->getJson('/api/dashboard?competencia=2026-09')
            ->assertOk()
            ->json('data.insights');

        $this->assertContains('metas_acima_da_regra', array_column($insights, 'tipo'));
    }
    public function test_ordena_pelo_que_ainda_pede_decisao(): void
    {
        // Concluida com o prazo MAIS PROXIMO: nao pode liderar a lista.
        Meta::factory()->create([
            'user_id' => $this->user->id, 'nome' => 'Ja fechada',
            'valor_objetivo' => 500, 'valor_atual' => 500, 'prazo' => '2026-09-30',
        ]);
        Meta::factory()->create([
            'user_id' => $this->user->id, 'nome' => 'Sem data',
            'valor_objetivo' => 500, 'valor_atual' => 0, 'prazo' => null,
        ]);
        Meta::factory()->create([
            'user_id' => $this->user->id, 'nome' => 'Com prazo',
            'valor_objetivo' => 500, 'valor_atual' => 0, 'prazo' => '2026-12-31',
        ]);

        $nomes = array_column(
            $this->actingAs($this->user)->getJson('/api/metas')->json('data'),
            'nome'
        );

        $this->assertSame(['Com prazo', 'Sem data', 'Ja fechada'], $nomes);
    }
}
