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
    ) {
    }

    /**
     * Estimativa de gasto diário até o fim do período.
     *
     * O cálculo protege a meta de poupança ainda não cumprida: de nada adianta
     * dizer que sobram R$ 900 se R$ 400 deveriam ir para a reserva.
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

        $metaPoupanca = round($renda * self::META_POUPANCA, 2);
        $poupancaFeita = $porTipo[TipoCategoria::Poupanca->value];
        $reservado = round(max(0.0, $metaPoupanca - $poupancaFeita), 2);

        $disponivel = round($renda - $gastos - $reservado, 2);
        $diasRestantes = max(1, $progresso['dias_restantes']);

        if ($disponivel <= 0.0) {
            return [
                'disponivel'         => false,
                'motivo'             => 'sem_folga',
                'mensagem'           => 'Você já comprometeu toda a renda deste período, considerando a reserva de poupança.',
                'valor_disponivel'   => $disponivel,
                'reservado_poupanca' => $reservado,
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
            'reservado_poupanca' => $reservado,
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

    /** @return array<string, mixed> */
    private function indisponivel(string $motivo, string $mensagem): array
    {
        return [
            'disponivel'         => false,
            'motivo'             => $motivo,
            'mensagem'           => $mensagem,
            'valor_disponivel'   => null,
            'reservado_poupanca' => null,
            'dias_restantes'     => null,
            'por_dia'            => null,
            'ressalva'           => $this->ressalva(),
        ];
    }

    private function ressalva(): string
    {
        return 'Estimativa calculada a partir dos dados que você registrou. Não é recomendação financeira.';
    }

    private function pct(float $valor): string
    {
        return str_replace('.', ',', (string) round($valor, 1)) . '%';
    }
}
