<?php

namespace Tests\Feature\Api;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Salario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegraCincoTrintaVinteTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    /** @var array<string, Categoria> */
    private array $categorias = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        foreach (TipoCategoria::cases() as $tipo) {
            $this->categorias[$tipo->value] = Categoria::factory()
                ->doTipo($tipo)
                ->create(['user_id' => null, 'nome' => 'Cat ' . $tipo->value]);
        }
    }

    private function gastar(TipoCategoria $tipo, float $valor, string $data = '2026-09-10'): void
    {
        Gasto::factory()->create([
            'user_id'      => $this->user->id,
            'categoria_id' => $this->categorias[$tipo->value]->id,
            'valor'        => $valor,
            'data'         => $data,
        ]);
    }

    private function faixa(array $json, string $tipo): array
    {
        foreach ($json['data']['faixas'] as $faixa) {
            if ($faixa['tipo'] === $tipo) {
                return $faixa;
            }
        }

        $this->fail("Faixa {$tipo} não encontrada na resposta.");
    }

    /** Cenário do enunciado: renda 5.500, com gastos nos três tipos. */
    public function test_calcula_limites_gastos_percentuais_e_status(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 5500,
        ]);

        $this->gastar(TipoCategoria::Necessidade, 2100);
        $this->gastar(TipoCategoria::Desejo, 1800);
        $this->gastar(TipoCategoria::Poupanca, 1100);

        $json = $this->actingAs($this->user)
            ->getJson('/api/regra?competencia=2026-09')
            ->assertOk()
            ->json();

        $this->assertSame(5500.0, (float) $json['data']['renda']);
        $this->assertSame(5000.0, (float) $json['data']['total_gasto']);

        $necessidades = $this->faixa($json, 'necessidade');
        $this->assertSame(2750.0, (float) $necessidades['limite']);
        $this->assertSame(2100.0, (float) $necessidades['gasto']);
        $this->assertSame(76.4, (float) $necessidades['percentual']);
        $this->assertSame(650.0, (float) $necessidades['diferenca']);
        $this->assertSame('dentro_do_limite', $necessidades['status']);

        $desejos = $this->faixa($json, 'desejo');
        $this->assertSame(1650.0, (float) $desejos['limite']);
        $this->assertSame(1800.0, (float) $desejos['gasto']);
        $this->assertSame(109.1, (float) $desejos['percentual']);
        $this->assertSame(-150.0, (float) $desejos['diferenca']);
        $this->assertSame('acima_do_limite', $desejos['status']);

        $poupanca = $this->faixa($json, 'poupanca');
        $this->assertSame(1100.0, (float) $poupanca['limite']);
        $this->assertSame(1100.0, (float) $poupanca['gasto']);
        $this->assertSame(100.0, (float) $poupanca['percentual']);
        $this->assertSame('meta_atingida', $poupanca['status']);
    }

    /** Agregação por TIPO, não por total: era exatamente o que estava errado antes. */
    public function test_agrega_por_tipo_de_categoria(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 1000,
        ]);

        $this->gastar(TipoCategoria::Necessidade, 100);
        $this->gastar(TipoCategoria::Necessidade, 50);
        $this->gastar(TipoCategoria::Desejo, 200);

        $json = $this->actingAs($this->user)->getJson('/api/regra?competencia=2026-09')->json();

        $this->assertSame(150.0, (float) $this->faixa($json, 'necessidade')['gasto']);
        $this->assertSame(200.0, (float) $this->faixa($json, 'desejo')['gasto']);
        $this->assertSame(0.0, (float) $this->faixa($json, 'poupanca')['gasto']);
    }

    /**
     * Com renda 0 o frontend antigo gerava width: Infinity% e "Infinity% do
     * salário". A API não pode devolver INF nem NAN em hipótese alguma.
     */
    public function test_renda_zero_nao_gera_infinity_nem_nan(): void
    {
        $this->gastar(TipoCategoria::Necessidade, 500);

        $json = $this->actingAs($this->user)
            ->getJson('/api/regra?competencia=2026-09')
            ->assertOk()
            ->json();

        $this->assertSame(0.0, (float) $json['data']['renda']);

        foreach ($json['data']['faixas'] as $faixa) {
            $this->assertIsNumeric($faixa['percentual']);
            $this->assertFalse(is_infinite((float) $faixa['percentual']), "percentual infinito em {$faixa['tipo']}");
            $this->assertFalse(is_nan((float) $faixa['percentual']), "percentual NAN em {$faixa['tipo']}");
            $this->assertSame(0.0, (float) $faixa['percentual']);
            $this->assertSame(0.0, (float) $faixa['limite']);
            $this->assertSame('sem_renda', $faixa['status']);
        }

        $this->assertStringNotContainsString(
            'Infinity',
            $this->actingAs($this->user)->getJson('/api/regra?competencia=2026-09')->getContent()
        );
    }

    public function test_competencia_sem_gastos_devolve_zeros(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 3000,
        ]);

        $json = $this->actingAs($this->user)->getJson('/api/regra?competencia=2026-09')->json();

        $this->assertSame(0.0, (float) $json['data']['total_gasto']);
        $this->assertSame(1500.0, (float) $this->faixa($json, 'necessidade')['limite']);
        $this->assertSame('dentro_do_limite', $this->faixa($json, 'necessidade')['status']);
        $this->assertSame('abaixo_da_meta', $this->faixa($json, 'poupanca')['status']);
    }

    public function test_considera_apenas_gastos_da_competencia_pedida(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 1000,
        ]);

        $this->gastar(TipoCategoria::Necessidade, 100, '2026-09-05');
        $this->gastar(TipoCategoria::Necessidade, 900, '2026-08-05');

        $json = $this->actingAs($this->user)->getJson('/api/regra?competencia=2026-09')->json();

        $this->assertSame(100.0, (float) $this->faixa($json, 'necessidade')['gasto']);
    }

    public function test_status_de_atencao_perto_do_limite(): void
    {
        Salario::factory()->naCompetencia('2026-09')->create([
            'user_id' => $this->user->id, 'valor' => 1000,
        ]);

        // Limite de necessidades = 500; 95% dele = 475.
        $this->gastar(TipoCategoria::Necessidade, 475);

        $json = $this->actingAs($this->user)->getJson('/api/regra?competencia=2026-09')->json();

        $this->assertSame('atencao', $this->faixa($json, 'necessidade')['status']);
    }

    public function test_sem_competencia_usa_o_mes_corrente(): void
    {
        Salario::factory()->naCompetencia(now()->format('Y-m'))->create([
            'user_id' => $this->user->id, 'valor' => 2000,
        ]);

        $this->actingAs($this->user)->getJson('/api/regra')
            ->assertOk()
            ->assertJsonPath('data.competencia', now()->format('Y-m'))
            ->assertJsonPath('data.renda', fn ($v) => (float) $v === 2000.0);
    }
}
