<?php

namespace App\Services\Analise;

/**
 * Insights determinísticos, gerados por regras aritméticas.
 *
 * Sem IA, sem heurística mágica: cada insight nasce de uma condição explícita
 * sobre números que o usuário registrou, e carrega o contexto numérico que o
 * originou para que ele possa conferir.
 *
 * Ordem importa mais que quantidade. Um painel com quinze avisos não é
 * informação, é ruído — por isso as regras são avaliadas em ordem de gravidade
 * e no máximo LIMITE são devolvidas.
 */
class AnalisadorPorRegras implements AnalisadorFinanceiroInterface
{
    private const LIMITE = 4;

    /** Peso de cada severidade na hora de escolher o que mostrar. */
    private const PRIORIDADE = [
        'critico'      => 0,
        'atencao'      => 1,
        'positivo'     => 2,
        'informativo'  => 3,
    ];

    /** Uma categoria acima disso concentra gasto demais. */
    private const CONCENTRACAO = 0.40;

    /** Variação mínima, em % e em reais, para valer um aviso de aumento. */
    private const VARIACAO_RELEVANTE = 25.0;
    private const VALOR_RELEVANTE = 50.0;

    public function analisar(array $contexto): array
    {
        $insights = array_merge(
            $this->semDados($contexto),
            $this->saldo($contexto),
            $this->faixasDaRegra($contexto),
            $this->orcamentos($contexto),
            $this->concentracao($contexto),
            $this->comparacao($contexto),
            $this->ritmo($contexto),
            $this->conquistas($contexto),
        );

        usort(
            $insights,
            fn ($a, $b) => self::PRIORIDADE[$a['severidade']] <=> self::PRIORIDADE[$b['severidade']]
        );

        return array_slice($insights, 0, self::LIMITE);
    }

    /** @return array<int, array<string, mixed>> */
    private function semDados(array $c): array
    {
        if ($c['resumo']['renda'] <= 0) {
            return [[
                'tipo'       => 'sem_renda',
                'titulo'     => 'Renda não cadastrada',
                'mensagem'   => 'Sem a renda do período não é possível calcular limites nem saúde financeira.',
                'severidade' => 'critico',
                'contexto'   => [],
            ]];
        }

        if ($c['total_lancamentos'] === 0) {
            return [[
                'tipo'       => 'sem_lancamentos',
                'titulo'     => 'Nenhum lançamento neste período',
                'mensagem'   => 'Registre seus gastos para acompanhar como a renda está sendo usada.',
                'severidade' => 'informativo',
                'contexto'   => [],
            ]];
        }

        return [];
    }

    /** @return array<int, array<string, mixed>> */
    private function saldo(array $c): array
    {
        $saldo = $c['resumo']['saldo'];

        if ($c['resumo']['renda'] <= 0 || $saldo >= 0) {
            return [];
        }

        return [[
            'tipo'       => 'saldo_negativo',
            'titulo'     => 'Gastos acima da renda',
            'mensagem'   => 'Neste período você gastou ' . $this->reais(abs($saldo)) . ' a mais do que recebeu.',
            'severidade' => 'critico',
            'contexto'   => ['saldo' => $saldo],
        ]];
    }

    /** @return array<int, array<string, mixed>> */
    private function faixasDaRegra(array $c): array
    {
        $insights = [];

        foreach ($c['regra']['faixas'] as $faixa) {
            if ($faixa['status'] === 'acima_do_limite') {
                $insights[] = [
                    'tipo'       => 'faixa_estourada',
                    'titulo'     => $faixa['rotulo'] . ' acima do limite',
                    'mensagem'   => 'Você passou ' . $this->reais(abs($faixa['diferenca'])) . ' do limite recomendado para ' . mb_strtolower($faixa['rotulo']) . '.',
                    'severidade' => 'critico',
                    'contexto'   => [
                        'tipo_categoria' => $faixa['tipo'],
                        'gasto'          => $faixa['gasto'],
                        'limite'         => $faixa['limite'],
                        'excedente'      => abs($faixa['diferenca']),
                    ],
                ];

                continue;
            }

            if ($faixa['status'] === 'atencao') {
                $insights[] = [
                    'tipo'       => 'faixa_perto_do_limite',
                    'titulo'     => $faixa['rotulo'] . ' perto do limite',
                    'mensagem'   => 'Restam apenas ' . $this->reais($faixa['diferenca']) . ' do limite de ' . mb_strtolower($faixa['rotulo']) . '.',
                    'severidade' => 'atencao',
                    'contexto'   => [
                        'tipo_categoria' => $faixa['tipo'],
                        'restante'       => $faixa['diferenca'],
                        'percentual'     => $faixa['percentual'],
                    ],
                ];
            }
        }

        return $insights;
    }

    /**
     * Orçamentos estourados e no limite.
     *
     * Só o pior caso vira insight: listar cinco categorias estouradas encheria
     * o painel e diluiria a informação. O número total continua visível na tela
     * de Orçamento.
     *
     * @return array<int, array<string, mixed>>
     */
    private function orcamentos(array $c): array
    {
        $itens = $c['orcamentos']['itens'] ?? [];

        if ($itens === []) {
            return [];
        }

        $estourados = array_values(array_filter($itens, fn ($i) => $i['status'] === 'estourado'));

        if ($estourados !== []) {
            $pior = $estourados[0];
            $excedente = abs($pior['restante']);
            $extras = count($estourados) - 1;

            return [[
                'tipo'       => 'orcamento_estourado',
                'titulo'     => 'Orçamento de ' . $pior['categoria'] . ' estourado',
                'mensagem'   => 'Você passou ' . $this->reais($excedente) . ' do limite definido'
                    . ($extras > 0
                        ? ' — e outra' . ($extras > 1 ? 's ' . $extras . ' categorias estão' : ' categoria está') . ' acima do orçamento.'
                        : '.'),
                'severidade' => 'critico',
                'contexto'   => [
                    'categoria'  => $pior['categoria'],
                    'limite'     => $pior['limite'],
                    'gasto'      => $pior['gasto'],
                    'excedente'  => $excedente,
                    'estourados' => count($estourados),
                ],
            ]];
        }

        $emAtencao = array_values(array_filter($itens, fn ($i) => $i['status'] === 'atencao'));

        if ($emAtencao !== []) {
            $pior = $emAtencao[0];

            return [[
                'tipo'       => 'orcamento_no_limite',
                'titulo'     => 'Orçamento de ' . $pior['categoria'] . ' perto do limite',
                'mensagem'   => 'Restam ' . $this->reais($pior['restante']) . ' dos ' . $this->reais($pior['limite']) . ' orçados.',
                'severidade' => 'atencao',
                'contexto'   => [
                    'categoria'  => $pior['categoria'],
                    'restante'   => $pior['restante'],
                    'percentual' => $pior['percentual'],
                ],
            ]];
        }

        return [];
    }

    /** @return array<int, array<string, mixed>> */
    private function concentracao(array $c): array
    {
        $total = $c['resumo']['gastos'];

        if ($total <= 0 || $c['categorias'] === []) {
            return [];
        }

        $maior = $c['categorias'][0];
        $proporcao = $maior['total'] / $total;

        if ($proporcao < self::CONCENTRACAO || count($c['categorias']) < 2) {
            return [];
        }

        return [[
            'tipo'       => 'concentracao',
            'titulo'     => 'Gastos concentrados em uma categoria',
            'mensagem'   => $maior['categoria'] . ' responde por ' . $this->pct($proporcao * 100) . ' de tudo que você gastou no período.',
            'severidade' => 'atencao',
            'contexto'   => [
                'categoria'  => $maior['categoria'],
                'total'      => $maior['total'],
                'percentual' => round($proporcao * 100, 1),
            ],
        ]];
    }

    /** @return array<int, array<string, mixed>> */
    private function comparacao(array $c): array
    {
        if (! ($c['comparacao']['disponivel'] ?? false)) {
            return [];
        }

        $gastos = $c['comparacao']['gastos'];

        if ($gastos['variacao_percentual'] === null) {
            return [];
        }

        $diferenca = $c['resumo']['gastos'] - $gastos['anterior'];

        if ($gastos['variacao_percentual'] >= self::VARIACAO_RELEVANTE && $diferenca >= self::VALOR_RELEVANTE) {
            return [[
                'tipo'       => 'aumento_de_gastos',
                'titulo'     => 'Gastos subiram em relação ao mês anterior',
                'mensagem'   => 'Você gastou ' . $this->pct($gastos['variacao_percentual']) . ' a mais que no período anterior, ' . $this->reais($diferenca) . ' de diferença.',
                'severidade' => 'atencao',
                'contexto'   => [
                    'anterior'  => $gastos['anterior'],
                    'atual'     => $c['resumo']['gastos'],
                    'variacao'  => $gastos['variacao_percentual'],
                ],
            ]];
        }

        if ($gastos['variacao_percentual'] <= -self::VARIACAO_RELEVANTE && abs($diferenca) >= self::VALOR_RELEVANTE) {
            return [[
                'tipo'       => 'reducao_de_gastos',
                'titulo'     => 'Você gastou menos que no mês anterior',
                'mensagem'   => 'Uma redução de ' . $this->pct(abs($gastos['variacao_percentual'])) . ', ou ' . $this->reais(abs($diferenca)) . '.',
                'severidade' => 'positivo',
                'contexto'   => [
                    'anterior' => $gastos['anterior'],
                    'atual'    => $c['resumo']['gastos'],
                    'variacao' => $gastos['variacao_percentual'],
                ],
            ]];
        }

        return [];
    }

    /** @return array<int, array<string, mixed>> */
    private function ritmo(array $c): array
    {
        if (! ($c['ritmo']['disponivel'] ?? false) || $c['ritmo']['status'] !== 'acelerado') {
            return [];
        }

        return [[
            'tipo'       => 'ritmo_acelerado',
            'titulo'     => 'Ritmo de gastos acelerado',
            'mensagem'   => $c['ritmo']['mensagem'],
            'severidade' => 'atencao',
            'contexto'   => [
                'percentual_gasto'   => $c['ritmo']['percentual_gasto'],
                'percentual_periodo' => $c['ritmo']['percentual_periodo'],
            ],
        ]];
    }

    /** @return array<int, array<string, mixed>> */
    private function conquistas(array $c): array
    {
        $insights = [];

        foreach ($c['regra']['faixas'] as $faixa) {
            if ($faixa['status'] === 'meta_atingida') {
                $insights[] = [
                    'tipo'       => 'meta_poupanca',
                    'titulo'     => 'Meta de poupança atingida',
                    'mensagem'   => 'Você guardou ' . $this->reais($faixa['gasto']) . ' neste período, alcançando os 20% recomendados.',
                    'severidade' => 'positivo',
                    'contexto'   => ['guardado' => $faixa['gasto'], 'meta' => $faixa['limite']],
                ];
            }
        }

        $taxa = $c['resumo']['taxa_economia'];

        if ($c['resumo']['renda'] > 0 && $taxa >= 20.0) {
            $insights[] = [
                'tipo'       => 'boa_economia',
                'titulo'     => 'Boa taxa de economia',
                'mensagem'   => 'Sobrou ' . $this->pct($taxa) . ' da sua renda neste período.',
                'severidade' => 'positivo',
                'contexto'   => ['taxa_economia' => $taxa],
            ];
        }

        return $insights;
    }

    private function reais(float $valor): string
    {
        return 'R$ ' . number_format($valor, 2, ',', '.');
    }

    private function pct(float $valor): string
    {
        return str_replace('.', ',', (string) round($valor, 1)) . '%';
    }
}
