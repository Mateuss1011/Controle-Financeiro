<?php

namespace App\Services\Financeiro;

use App\Enums\TipoCategoria;
use Carbon\CarbonImmutable;

/**
 * "Quanto posso gastar?" e "estou gastando rápido demais?".
 *
 * As duas perguntas vêm da mesma aritmética simples, e é importante que sejam
 * simples: isto NÃO é aconselhamento financeiro, é uma divisão sobre os dados
 * que o próprio usuário registrou. A resposta da API carrega essa ressalva
 * explicitamente para que a interface a exiba.
 *
 * Nenhuma divisão acontece sem checar o denominador. Quando falta base, o
 * serviço devolve `disponivel: false` com o motivo — nunca R$ 0,00 como se
 * fosse uma recomendação de gasto.
 */
class CapacidadeDeGastoService
{
    /** Fatia da renda que a regra 50/30/20 reserva para poupança. */
    private const META_POUPANCA = 0.20;

    /** Margem de tolerância antes de chamar o ritmo de "acelerado". */
    private const TOLERANCIA_RITMO = 10.0;

    public function __construct(
        private readonly RendaService $rendas,
        private readonly RegraCincoTrintaVinteService $regra,
        private readonly PeriodoService $periodos,
        private readonly MetaService $metas,
    ) {
    }

    /**
     * Estimativa de gasto diário até o fim do período.
     *
     * O cálculo protege o que não deveria ser gasto. Duas fontes disputam essa
     * reserva:
     *
     *  - a REGRA 50/30/20, que separa 20% da renda para poupança;
     *  - as METAS com prazo, que exigem um aporte mensal para fechar a tempo.
     *
     * As duas medem a mesma coisa por caminhos diferentes: dinheiro guardado.
     * Somá-las contaria o mesmo real duas vezes; ignorar uma delas quebraria a
     * outra. O que se reserva é o MAIOR dos dois — guardar o suficiente para as
     * metas já satisfaz a regra, e vice-versa.
     *
     * Quando as metas exigem mais que a regra, isso não é erro: é informação. A
     * resposta devolve os dois valores e sinaliza qual prevaleceu, para a
     * interface poder mostrar o conflito em vez de escondê-lo.
     *
     * @return array<string, mixed>
     */
    public function calcular(int $userId, CarbonImmutable $competencia): array
    {
        $renda = $this->rendas->valorDaCompetencia($userId, $competencia);

        if ($renda <= 0.0) {
            return $this->indisponivel(
                'sem_renda',
                'Cadastre a renda deste período para saber quanto pode gastar por dia.'
            );
        }

        $progresso = $this->periodos->progresso($competencia);

        if ($progresso['encerrado']) {
            return $this->indisponivel(
                'periodo_encerrado',
                'Este período já terminou. A estimativa diária só faz sentido para o mês em andamento.'
            );
        }

        $porTipo = $this->regra->totaisPorTipo($userId, $competencia);
        $gastos = array_sum($porTipo);

        $reserva = $this->reserva(
            $userId,
            $renda,
            $porTipo[TipoCategoria::Poupanca->value],
            $competencia,
        );

        $disponivel = round($renda - $gastos - $reserva['aplicada'], 2);
        $diasRestantes = max(1, $progresso['dias_restantes']);

        if ($disponivel <= 0.0) {
            return [
                'disponivel'         => false,
                'motivo'             => 'sem_folga',
                'mensagem'           => $reserva['metas_prevalecem']
                    ? 'Você já comprometeu toda a renda deste período, considerando o aporte necessário para suas metas.'
                    : 'Você já comprometeu toda a renda deste período, considerando a reserva de poupança.',
                'valor_disponivel'   => $disponivel,
                'reservado_poupanca' => $reserva['aplicada'],
                'reserva'            => $reserva,
                'dias_restantes'     => $progresso['dias_restantes'],
                'por_dia'            => null,
                'ressalva'           => $this->ressalva(),
            ];
        }

        return [
            'disponivel'         => true,
            'motivo'             => null,
            'mensagem'           => null,
            'valor_disponivel'   => $disponivel,
            'reservado_poupanca' => $reserva['aplicada'],
            'reserva'            => $reserva,
            'dias_restantes'     => $progresso['dias_restantes'],
            'por_dia'            => round($disponivel / $diasRestantes, 2),
            'ressalva'           => $this->ressalva(),
        ];
    }

    /**
     * Ritmo de gastos: compara o quanto da renda já foi usado com o quanto do
     * período já passou.
     *
     * Só faz sentido no mês em andamento — num mês encerrado o tempo decorrido
     * é sempre 100% e a comparação não informa nada.
     *
     * @return array<string, mixed>
     */
    public function ritmo(int $userId, CarbonImmutable $competencia): array
    {
        $progresso = $this->periodos->progresso($competencia);

        if (! $progresso['corrente']) {
            return ['disponivel' => false, 'motivo' => 'periodo_nao_corrente'];
        }

        $renda = $this->rendas->valorDaCompetencia($userId, $competencia);

        if ($renda <= 0.0) {
            return ['disponivel' => false, 'motivo' => 'sem_renda'];
        }

        if ($progresso['dias'] <= 0) {
            return ['disponivel' => false, 'motivo' => 'periodo_invalido'];
        }

        $gastos = array_sum($this->regra->totaisPorTipo($userId, $competencia));

        $percentualGasto = round(($gastos / $renda) * 100, 1);
        $percentualPeriodo = round(($progresso['dias_decorridos'] / $progresso['dias']) * 100, 1);
        $diferenca = round($percentualGasto - $percentualPeriodo, 1);

        $status = match (true) {
            $diferenca > self::TOLERANCIA_RITMO  => 'acelerado',
            $diferenca < -self::TOLERANCIA_RITMO => 'folgado',
            default                              => 'equilibrado',
        };

        return [
            'disponivel'         => true,
            'motivo'             => null,
            'percentual_gasto'   => $percentualGasto,
            'percentual_periodo' => $percentualPeriodo,
            'diferenca'          => $diferenca,
            'status'             => $status,
            'mensagem'           => match ($status) {
                'acelerado'   => 'Você já usou ' . $this->pct($percentualGasto) . ' da renda, mas só ' . $this->pct($percentualPeriodo) . ' do mês passou.',
                'folgado'     => 'Você usou ' . $this->pct($percentualGasto) . ' da renda com ' . $this->pct($percentualPeriodo) . ' do mês decorrido.',
                'equilibrado' => 'Seus gastos estão acompanhando o ritmo do mês.',
            },
        ];
    }

    /**
     * Quanto da renda fica fora do "posso gastar", e por quê.
     *
     * @return array<string, mixed>
     */
    private function reserva(
        int $userId,
        float $renda,
        float $poupancaFeita,
        CarbonImmutable $competencia,
    ): array {
        $metaRegra = round($renda * self::META_POUPANCA, 2);
        $pelaRegra = round(max(0.0, $metaRegra - $poupancaFeita), 2);

        $compromissoMetas = round(
            $this->metas->compromissoMensal($userId, $competencia->startOfMonth()),
            2,
        );

        // O que já foi guardado no mês abate também o compromisso das metas: é
        // o mesmo dinheiro, contado de outro jeito.
        $pelasMetas = round(max(0.0, $compromissoMetas - $poupancaFeita), 2);

        $aplicada = max($pelaRegra, $pelasMetas);

        return [
            'aplicada'          => $aplicada,
            'pela_regra'        => $pelaRegra,
            'pelas_metas'       => $pelasMetas,
            'compromisso_metas' => $compromissoMetas,
            'meta_regra'        => $metaRegra,
            'poupanca_feita'    => round($poupancaFeita, 2),
            'metas_prevalecem'  => $pelasMetas > $pelaRegra,
            'explicacao'        => $this->explicarReserva($pelaRegra, $pelasMetas),
        ];
    }

    private function explicarReserva(float $pelaRegra, float $pelasMetas): string
    {
        if ($pelasMetas <= 0.0 && $pelaRegra <= 0.0) {
            return 'Nada a reservar: o que você já guardou no período cobre a regra 50/30/20 e o aporte das metas com prazo.';
        }

        if ($pelasMetas > $pelaRegra) {
            return 'Suas metas com prazo exigem mais do que os 20% da regra 50/30/20. Reservamos o maior dos dois valores, o das metas.';
        }

        if ($pelasMetas > 0.0) {
            return 'Os 20% da regra 50/30/20 já cobrem o aporte necessário das suas metas com prazo.';
        }

        return 'Reserva dos 20% da regra 50/30/20 ainda não cumpridos no período.';
    }

    /** @return array<string, mixed> */
    private function indisponivel(string $motivo, string $mensagem): array
    {
        return [
            'disponivel'         => false,
            'motivo'             => $motivo,
            'mensagem'           => $mensagem,
            'valor_disponivel'   => null,
            'reservado_poupanca' => null,
            'reserva'            => null,
            'dias_restantes'     => null,
            'por_dia'            => null,
            'ressalva'           => $this->ressalva(),
        ];
    }

    private function ressalva(): string
    {
        return 'Estimativa calculada a partir da renda, dos gastos e das metas que você registrou. Não é recomendação financeira.';
    }

    private function pct(float $valor): string
    {
        return str_replace('.', ',', (string) round($valor, 1)) . '%';
    }
}
