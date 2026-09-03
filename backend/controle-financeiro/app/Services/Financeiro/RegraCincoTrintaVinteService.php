<?php

namespace App\Services\Financeiro;

use App\Enums\TipoCategoria;
use App\Models\Gasto;
use Carbon\CarbonImmutable;

/**
 * Implementação REAL da regra 50/30/20.
 *
 * Diferente da versão anterior — que só exibia os limites e comparava o gasto
 * TOTAL contra cada faixa — aqui os gastos são agregados por
 * `categorias.tipo`, que é o dado que sempre existiu no banco e nunca era usado.
 *
 * Nenhuma divisão é feita sem checar o denominador: com renda 0 os percentuais
 * são 0.0 e o status é 'sem_renda'. O resultado nunca contém INF ou NAN.
 */
class RegraCincoTrintaVinteService
{
    public function __construct(private readonly RendaService $rendas)
    {
    }

    /**
     * @return array{renda: float, total_gasto: float, faixas: array<int, array<string, mixed>>}
     */
    public function calcular(int $userId, CarbonImmutable $competencia): array
    {
        $renda = $this->rendas->valorDaCompetencia($userId, $competencia);
        $gastos = $this->totaisPorTipo($userId, $competencia);

        $faixas = [];

        foreach (TipoCategoria::cases() as $tipo) {
            $gasto  = $gastos[$tipo->value] ?? 0.0;
            $limite = round($renda * $tipo->percentual(), 2);

            $faixas[] = [
                'tipo'       => $tipo->value,
                'rotulo'     => $tipo->rotulo(),
                'percentual_regra' => $tipo->percentual(),
                'gasto'      => round($gasto, 2),
                'limite'     => $limite,
                'percentual' => $this->percentual($gasto, $limite),
                'diferenca'  => round($limite - $gasto, 2),
                'status'     => $this->status($tipo, $gasto, $limite, $renda),
            ];
        }

        return [
            'renda'       => round($renda, 2),
            'total_gasto' => round(array_sum($gastos), 2),
            'faixas'      => $faixas,
        ];
    }

    /**
     * Total gasto em cada tipo de categoria na competência.
     *
     * @return array<string, float>
     */
    public function totaisPorTipo(int $userId, CarbonImmutable $competencia): array
    {
        $linhas = Gasto::withoutGlobalScope('doUsuario')
            ->where('gastos.user_id', $userId)
            ->daCompetencia($competencia->year, $competencia->month)
            ->join('categorias', 'categorias.id', '=', 'gastos.categoria_id')
            ->groupBy('categorias.tipo')
            ->selectRaw('categorias.tipo as tipo, SUM(gastos.valor) as total')
            ->pluck('total', 'tipo');

        $totais = [];

        foreach (TipoCategoria::cases() as $tipo) {
            $totais[$tipo->value] = (float) ($linhas[$tipo->value] ?? 0);
        }

        return $totais;
    }

    /** Percentual do limite já utilizado. Denominador 0 => 0.0, nunca INF/NAN. */
    private function percentual(float $gasto, float $limite): float
    {
        if ($limite <= 0.0) {
            return 0.0;
        }

        return round(($gasto / $limite) * 100, 1);
    }

    /**
     * Necessidades e desejos são TETOS: ultrapassar é ruim.
     * Poupança é META: atingir é bom.
     */
    private function status(TipoCategoria $tipo, float $gasto, float $limite, float $renda): string
    {
        if ($renda <= 0.0) {
            return 'sem_renda';
        }

        if ($tipo->ehMeta()) {
            return match (true) {
                $gasto >= $limite       => 'meta_atingida',
                $gasto >= $limite * 0.7 => 'proximo_da_meta',
                default                 => 'abaixo_da_meta',
            };
        }

        return match (true) {
            $gasto > $limite        => 'acima_do_limite',
            $gasto >= $limite * 0.9 => 'atencao',
            default                 => 'dentro_do_limite',
        };
    }
}
