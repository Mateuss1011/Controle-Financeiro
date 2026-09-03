<?php

namespace App\Services\Financeiro;

use App\Enums\TipoCategoria;
use Carbon\CarbonImmutable;

/**
 * Índice de Saúde Financeira: 0 a 100.
 *
 * METODOLOGIA — documentada aqui e devolvida na API, porque uma pontuação que
 * o usuário não consegue auditar não gera confiança.
 *
 * Quatro indicadores, cada um normalizado em 0..1 por interpolação linear e
 * multiplicado pelo seu peso:
 *
 *  1. Taxa de poupança (peso 35)
 *     p = gasto do tipo poupança ÷ renda. Nota = p / 0,20, saturando em 1.
 *     Ou seja: guardar 20% da renda vale nota cheia; guardar 10%, meia nota.
 *
 *  2. Margem do período (peso 25)
 *     m = (renda − gastos) ÷ renda. Nota = m / 0,20, saturando em 1.
 *     Saldo zero ou negativo zera o indicador.
 *
 *  3. Aderência a necessidades (peso 20)
 *     n = gasto do tipo necessidade ÷ renda. Até 50% da renda, nota cheia.
 *     Acima disso decai linearmente e chega a zero quando as necessidades
 *     consomem 100% da renda.
 *
 *  4. Aderência a desejos (peso 15)
 *     d = gasto do tipo desejo ÷ renda. Até 30% da renda, nota cheia. Decai
 *     linearmente e chega a zero em 60% da renda.
 *
 * O quinto indicador previsto na metodologia — cumprimento de orçamentos, peso
 * 5 — depende da funcionalidade de Orçamento, que ainda não existe. Enquanto
 * não existir, o peso é redistribuído proporcionalmente entre os quatro acima,
 * exatamente como a metodologia aprovada prevê.
 *
 * DADOS INSUFICIENTES: sem renda registrada, ou com menos de 3 lançamentos na
 * competência, não há base para uma nota. O serviço devolve `suficiente: false`
 * e nenhuma pontuação. Nota inventada é pior do que nota nenhuma.
 */
class SaudeFinanceiraService
{
    private const MINIMO_LANCAMENTOS = 3;

    private const META_POUPANCA = 0.20;
    private const META_MARGEM = 0.20;
    private const TETO_NECESSIDADE = 0.50;
    private const TETO_DESEJO = 0.30;

    /** Pesos da metodologia. O de orçamento fica reservado para a Fase G. */
    private const PESOS = [
        'poupanca'     => 35,
        'margem'       => 25,
        'necessidades' => 20,
        'desejos'      => 15,
    ];

    public function __construct(
        private readonly RendaService $rendas,
        private readonly RegraCincoTrintaVinteService $regra,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function calcular(int $userId, CarbonImmutable $competencia, int $totalLancamentos): array
    {
        $renda = $this->rendas->valorDaCompetencia($userId, $competencia);
        $porTipo = $this->regra->totaisPorTipo($userId, $competencia);
        $gastos = array_sum($porTipo);

        if ($renda <= 0.0) {
            return $this->insuficiente('Cadastre a renda deste período para calcular sua saúde financeira.');
        }

        if ($totalLancamentos < self::MINIMO_LANCAMENTOS) {
            return $this->insuficiente(
                'Registre pelo menos ' . self::MINIMO_LANCAMENTOS . ' lançamentos neste período para calcular sua saúde financeira.'
            );
        }

        $indicadores = [
            $this->indicadorPoupanca($porTipo[TipoCategoria::Poupanca->value], $renda),
            $this->indicadorMargem($renda, $gastos),
            $this->indicadorTeto(
                chave: 'necessidades',
                rotulo: 'Necessidades dentro de 50%',
                gasto: $porTipo[TipoCategoria::Necessidade->value],
                renda: $renda,
                teto: self::TETO_NECESSIDADE,
            ),
            $this->indicadorTeto(
                chave: 'desejos',
                rotulo: 'Desejos dentro de 30%',
                gasto: $porTipo[TipoCategoria::Desejo->value],
                renda: $renda,
                teto: self::TETO_DESEJO,
            ),
        ];

        $pesoTotal = array_sum(self::PESOS);
        $pontuacao = 0.0;

        foreach ($indicadores as $indice => $indicador) {
            // Redistribuição proporcional: os pesos somam 95 sem o de orçamento.
            $pontos = $indicador['nota'] * (self::PESOS[$indicador['chave']] / $pesoTotal) * 100;
            $indicadores[$indice]['pontos'] = round($pontos, 1);
            $indicadores[$indice]['pontos_maximos'] = round((self::PESOS[$indicador['chave']] / $pesoTotal) * 100, 1);
            unset($indicadores[$indice]['nota']);

            $pontuacao += $pontos;
        }

        $pontuacao = (int) round(min(100, max(0, $pontuacao)));
        $classificacao = $this->classificar($pontuacao);

        return [
            'suficiente'    => true,
            'pontuacao'     => $pontuacao,
            'classificacao' => $classificacao,
            'rotulo'        => $this->rotuloDaClassificacao($classificacao),
            'resumo'        => $this->resumo($classificacao),
            'indicadores'   => $indicadores,
            'metodologia'   => 'Média ponderada de quatro indicadores: taxa de poupança (35), margem do período (25), necessidades até 50% da renda (20) e desejos até 30% da renda (15).',
            'motivo'        => null,
        ];
    }

    /** @return array<string, mixed> */
    private function insuficiente(string $motivo): array
    {
        return [
            'suficiente'    => false,
            'pontuacao'     => null,
            'classificacao' => null,
            'rotulo'        => null,
            'resumo'        => 'Dados insuficientes para calcular sua saúde financeira.',
            'indicadores'   => [],
            'metodologia'   => null,
            'motivo'        => $motivo,
        ];
    }

    /** @return array<string, mixed> */
    private function indicadorPoupanca(float $guardado, float $renda): array
    {
        $proporcao = $guardado / $renda;
        $nota = $this->limitar($proporcao / self::META_POUPANCA);

        return [
            'chave'      => 'poupanca',
            'rotulo'     => 'Taxa de poupança',
            'peso'       => self::PESOS['poupanca'],
            'valor'      => round($proporcao * 100, 1),
            'referencia' => 'meta de 20% da renda',
            'explicacao' => 'Quanto da renda foi para categorias de poupança neste período.',
            'nota'       => $nota,
        ];
    }

    /** @return array<string, mixed> */
    private function indicadorMargem(float $renda, float $gastos): array
    {
        $margem = ($renda - $gastos) / $renda;
        $nota = $margem <= 0.0 ? 0.0 : $this->limitar($margem / self::META_MARGEM);

        return [
            'chave'      => 'margem',
            'rotulo'     => 'Margem do período',
            'peso'       => self::PESOS['margem'],
            'valor'      => round($margem * 100, 1),
            'referencia' => 'meta de 20% da renda',
            'explicacao' => 'Quanto sobrou da renda depois de todos os gastos.',
            'nota'       => $nota,
        ];
    }

    /**
     * Indicador de teto: até o limite, nota cheia; acima, decai linearmente e
     * zera quando o gasto atinge o dobro do teto.
     *
     * @return array<string, mixed>
     */
    private function indicadorTeto(string $chave, string $rotulo, float $gasto, float $renda, float $teto): array
    {
        $proporcao = $gasto / $renda;

        $nota = $proporcao <= $teto
            ? 1.0
            : $this->limitar(1 - (($proporcao - $teto) / $teto));

        return [
            'chave'      => $chave,
            'rotulo'     => $rotulo,
            'peso'       => self::PESOS[$chave],
            'valor'      => round($proporcao * 100, 1),
            'referencia' => 'limite de ' . (int) round($teto * 100) . '% da renda',
            'explicacao' => 'Quanto da renda foi consumido por esta faixa da regra 50/30/20.',
            'nota'       => $nota,
        ];
    }

    private function limitar(float $valor): float
    {
        if (! is_finite($valor)) {
            return 0.0;
        }

        return min(1.0, max(0.0, $valor));
    }

    private function classificar(int $pontuacao): string
    {
        return match (true) {
            $pontuacao >= 80 => 'excelente',
            $pontuacao >= 60 => 'saudavel',
            $pontuacao >= 40 => 'atencao',
            default          => 'critica',
        };
    }

    private function rotuloDaClassificacao(string $classificacao): string
    {
        return match ($classificacao) {
            'excelente' => 'Excelente',
            'saudavel'  => 'Saudável',
            'atencao'   => 'Atenção',
            'critica'   => 'Crítica',
        };
    }

    private function resumo(string $classificacao): string
    {
        return match ($classificacao) {
            'excelente' => 'Suas finanças estão muito bem organizadas neste período.',
            'saudavel'  => 'Suas finanças estão saudáveis neste período.',
            'atencao'   => 'Há pontos deste período que merecem sua atenção.',
            'critica'   => 'Este período fechou com sinais importantes de desequilíbrio.',
        };
    }
}
