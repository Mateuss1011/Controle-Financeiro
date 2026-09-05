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
            $this->metas($contexto),
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

    /**
     * Metas: prazo vencido e conflito com a reserva da regra 50/30/20.
     *
     * No máximo um alerta e uma conquista — o painel de insights não é a tela
     * de Metas, ele só chama atenção para o que mudou de estado.
     *
     * @return array<int, array<string, mixed>>
     */
    private function metas(array $c): array
    {
        $itens = $c['metas']['itens'] ?? [];

        if ($itens === []) {
            return [];
        }

        $insights = [];

        $vencidas = array_values(array_filter($itens, fn ($m) => $m['status'] === 'vencida'));

        if ($vencidas !== []) {
            $pior = $vencidas[0];
            $extras = count($vencidas) - 1;

            $insights[] = [
                'tipo'       => 'meta_vencida',
                'titulo'     => 'Meta "' . $pior['nome'] . '" passou do prazo',
                'mensagem'   => 'Faltam ' . $this->reais($pior['restante']) . ' para concluí-la'
                    . ($extras > 0
                        ? ' — e outra' . ($extras > 1 ? 's ' . $extras . ' metas também venceram.' : ' meta também venceu.')
                        : '. Revise o valor ou o prazo.'),
                'severidade' => 'atencao',
                'contexto'   => [
                    'meta'     => $pior['nome'],
                    'restante' => $pior['restante'],
                    'prazo'    => $pior['prazo'],
                    'vencidas' => count($vencidas),
                ],
            ];
        } elseif ($c['capacidade']['reserva']['metas_prevalecem'] ?? false) {
            // A reserva aplicada saiu das metas, não da regra: vale dizer, para
            // o usuário não achar que o "posso gastar" encolheu sem motivo.
            $reserva = $c['capacidade']['reserva'];

            $insights[] = [
                'tipo'       => 'metas_acima_da_regra',
                'titulo'     => 'Suas metas pedem mais que os 20% da regra',
                'mensagem'   => 'O aporte necessário é ' . $this->reais($reserva['compromisso_metas'])
                    . ' por mês, contra ' . $this->reais($reserva['meta_regra'])
                    . ' da regra 50/30/20. A estimativa de gasto considera o maior dos dois.',
                'severidade' => 'informativo',
                'contexto'   => [
                    'compromisso_metas' => $reserva['compromisso_metas'],
                    'meta_regra'        => $reserva['meta_regra'],
                    'reserva_aplicada'  => $reserva['aplicada'],
                ],
            ];
        }

        $concluidas = array_values(array_filter($itens, fn ($m) => $m['status'] === 'concluida'));

        if ($concluidas !== []) {
            $ultima = end($concluidas);

            $insights[] = [
                'tipo'       => 'meta_concluida',
                'titulo'     => 'Meta "' . $ultima['nome'] . '" concluída',
                'mensagem'   => 'Você juntou os ' . $this->reais($ultima['valor_objetivo']) . ' do objetivo.'
                    . (count($concluidas) > 1 ? ' São ' . count($concluidas) . ' metas concluídas.' : ''),
                'severidade' => 'positivo',
                'contexto'   => [
                    'meta'       => $ultima['nome'],
                    'objetivo'   => $ultima['valor_objetivo'],
                    'concluidas' => count($concluidas),
                ],
            ];
        }

        return $insights;
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
