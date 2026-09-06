<?php

namespace App\Services\Financeiro;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use App\Models\Gasto;
use App\Models\Salario;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Relatórios: a mesma verdade do Dashboard, esticada no tempo.
 *
 * O Dashboard responde "como estou este mês". O relatório responde "para onde
 * isso está indo" — e a diferença entre as duas perguntas é o eixo do tempo,
 * não uma metodologia nova. Renda, gasto, saldo e a classificação 50/30/20 são
 * calculados exatamente como nas outras telas; o que muda é a agregação.
 *
 * A série mensal é CONTÍGUA: todo mês entre o início e o fim aparece, inclusive
 * os zerados. Omitir um mês vazio faria uma linha de tendência mentir, encostando
 * dezembro em fevereiro como se janeiro não tivesse existido.
 *
 * Toda a agregação sai de quatro consultas, não de uma por mês. Nenhuma divisão
 * acontece sem checar o denominador: o resultado nunca contém INF nem NAN.
 */
class RelatorioService
{
    /** Teto da janela. Acima disso o gráfico vira ruído e a consulta, peso. */
    public const MAX_MESES = 24;

    /** Janela padrão quando o usuário não escolhe nada. */
    private const MESES_PADRAO = 12;

    public function __construct(private readonly PeriodoService $periodos)
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function montar(int $userId, ?string $de, ?string $ate): array
    {
        $disponiveis = $this->periodos->comDados($userId, self::MAX_MESES);
        $intervalo = $this->intervalo($userId, $de, $ate, $disponiveis);

        $meses = $this->mesesDoIntervalo($intervalo['de'], $intervalo['ate']);

        $rendas = $this->rendasPorMes($userId, $intervalo['de'], $intervalo['ate']);
        $gastos = $this->gastosPorMesETipo($userId, $intervalo['de'], $intervalo['ate']);

        $evolucao = $this->evolucao($meses, $rendas, $gastos);
        $totais = $this->totais($evolucao);
        $categorias = $this->porCategoria($userId, $intervalo['de'], $intervalo['ate'], $totais['gastos']);
        $porTipo = $this->porTipo($evolucao, $totais);

        return [
            'periodo' => [
                'de'         => $intervalo['de']->format(PeriodoService::FORMATO),
                'ate'        => $intervalo['ate']->format(PeriodoService::FORMATO),
                'de_rotulo'  => $this->periodos->rotulo($intervalo['de']),
                'ate_rotulo' => $this->periodos->rotulo($intervalo['ate']),
                'meses'      => count($meses),
                'ajustado'   => $intervalo['ajustado'],
            ],
            'competencias_disponiveis' => $disponiveis,
            'tem_dados'                => $totais['renda'] > 0 || $totais['gastos'] > 0,
            'totais'                   => $totais,
            'evolucao'                 => $evolucao,
            'por_categoria'            => $categorias,
            'por_tipo'                 => $porTipo,
            'destaques'                => $this->destaques($userId, $intervalo, $evolucao, $categorias),
        ];
    }

    /**
     * Início e fim da janela.
     *
     * Sem escolha do usuário, ancoramos no período mais recente COM DADOS, e não
     * no mês do calendário: quem lançou tudo em dezembro e volta em setembro
     * seguinte receberia um relatório de doze meses vazios, o que não é um
     * relatório. Nesse caso `ajustado` avisa a interface.
     *
     * Datas invertidas são trocadas em vez de rejeitadas — é erro de digitação,
     * não de intenção. A janela é limitada a MAX_MESES a partir do fim.
     *
     * @param  array<int, string>  $disponiveis
     * @return array{de: CarbonImmutable, ate: CarbonImmutable, ajustado: bool}
     */
    private function intervalo(int $userId, ?string $de, ?string $ate, array $disponiveis): array
    {
        $pedidoDe = $this->periodos->daString($de);
        $pedidoAte = $this->periodos->daString($ate);

        if ($pedidoDe && $pedidoAte && $pedidoDe->greaterThan($pedidoAte)) {
            [$pedidoDe, $pedidoAte] = [$pedidoAte, $pedidoDe];
        }

        $maisRecente = $this->periodos->maisRecenteComDados($userId);
        $fimPadrao = $maisRecente ?? $this->periodos->atual();

        $fim = $pedidoAte ?? $fimPadrao;

        // Sem `de`, recuamos até o mais antigo com dado — nunca além do teto.
        $maisAntigo = $disponiveis === []
            ? null
            : $this->periodos->daString($disponiveis[count($disponiveis) - 1]);

        $inicioPadrao = $maisAntigo && $maisAntigo->greaterThan($fim->subMonths(self::MESES_PADRAO - 1))
            ? $maisAntigo
            : $fim->subMonths(self::MESES_PADRAO - 1);

        $inicio = $pedidoDe ?? $inicioPadrao;

        if ($inicio->lessThan($fim->subMonths(self::MAX_MESES - 1))) {
            $inicio = $fim->subMonths(self::MAX_MESES - 1);
        }

        return [
            'de'       => $inicio->startOfMonth(),
            'ate'      => $fim->startOfMonth(),
            'ajustado' => $pedidoAte === null
                && $maisRecente !== null
                && ! $maisRecente->equalTo($this->periodos->atual()),
        ];
    }

    /**
     * Todos os meses do intervalo, inclusive os sem dado.
     *
     * @return array<int, CarbonImmutable>
     */
    private function mesesDoIntervalo(CarbonImmutable $de, CarbonImmutable $ate): array
    {
        $meses = [];
        $cursor = $de;

        while ($cursor->lessThanOrEqualTo($ate) && count($meses) < self::MAX_MESES) {
            $meses[] = $cursor;
            $cursor = $cursor->addMonth();
        }

        return $meses;
    }

    /** @return array<string, float> competência 'Y-m' => valor */
    private function rendasPorMes(int $userId, CarbonImmutable $de, CarbonImmutable $ate): array
    {
        return Salario::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->whereBetween('competencia', [
                $de->toDateString(),
                $ate->endOfMonth()->toDateString(),
            ])
            ->get()
            ->mapWithKeys(fn (Salario $renda) => [
                CarbonImmutable::parse($renda->competencia)->format(PeriodoService::FORMATO) => (float) $renda->valor,
            ])
            ->all();
    }

    /**
     * Gasto de cada mês, já quebrado por faixa da regra 50/30/20.
     *
     * Uma consulta só para o intervalo inteiro, agrupada por (dia, tipo) e
     * dobrada em meses aqui no PHP. Agrupar por `YEAR()/MONTH()` no SQL seria
     * mais direto e é o que se escreve primeiro — mas amarra a consulta ao
     * MariaDB, e a suíte roda em SQLite: o relatório passaria em produção e
     * quebraria no teste, ou o contrário. O agrupamento por dia é portável e o
     * volume é pequeno: no máximo um punhado de linhas por dia com lançamento.
     *
     * @return array<string, array<string, float>> 'Y-m' => ['necessidade' => x, ...]
     */
    private function gastosPorMesETipo(int $userId, CarbonImmutable $de, CarbonImmutable $ate): array
    {
        $linhas = Gasto::withoutGlobalScope('doUsuario')
            ->where('gastos.user_id', $userId)
            ->whereBetween('gastos.data', [
                $de->toDateString(),
                $ate->endOfMonth()->toDateString(),
            ])
            ->join('categorias', 'categorias.id', '=', 'gastos.categoria_id')
            ->groupBy('gastos.data', 'categorias.tipo')
            ->selectRaw('gastos.data as data, categorias.tipo as tipo, SUM(gastos.valor) as total')
            ->get();

        $porMes = [];

        foreach ($linhas as $linha) {
            $chave = CarbonImmutable::parse($linha->data)->format(PeriodoService::FORMATO);

            $porMes[$chave][$linha->tipo] = ($porMes[$chave][$linha->tipo] ?? 0.0)
                + (float) $linha->total;
        }

        return $porMes;
    }

    /**
     * @param  array<int, CarbonImmutable>  $meses
     * @param  array<string, float>  $rendas
     * @param  array<string, array<string, float>>  $gastos
     * @return array<int, array<string, mixed>>
     */
    private function evolucao(array $meses, array $rendas, array $gastos): array
    {
        $serie = [];

        foreach ($meses as $mes) {
            $chave = $mes->format(PeriodoService::FORMATO);
            $renda = $rendas[$chave] ?? 0.0;
            $doMes = $gastos[$chave] ?? [];

            $porTipo = [];
            foreach (TipoCategoria::cases() as $tipo) {
                $porTipo[$tipo->value] = round((float) ($doMes[$tipo->value] ?? 0), 2);
            }

            $total = round(array_sum($porTipo), 2);
            $saldo = round($renda - $total, 2);

            $serie[] = [
                'competencia'   => $chave,
                'rotulo'        => $this->periodos->rotulo($mes),
                'rotulo_curto'  => mb_substr($this->periodos->rotulo($mes), 0, 3) . '/' . $mes->format('y'),
                'renda'         => round($renda, 2),
                'gastos'        => $total,
                'saldo'         => $saldo,
                // Sem renda não existe taxa de economia: 0 aqui é ausência de
                // base, e a interface distingue pelo campo `tem_dados`.
                'taxa_economia' => $renda > 0 ? round(($saldo / $renda) * 100, 1) : 0.0,
                'tem_dados'     => $renda > 0 || $total > 0,
                ...$porTipo,
            ];
        }

        return $serie;
    }

    /**
     * @param  array<int, array<string, mixed>>  $evolucao
     * @return array<string, float|int>
     */
    private function totais(array $evolucao): array
    {
        $renda = round(array_sum(array_column($evolucao, 'renda')), 2);
        $gastos = round(array_sum(array_column($evolucao, 'gastos')), 2);
        $saldo = round($renda - $gastos, 2);
        $meses = max(1, count($evolucao));

        $comRenda = count(array_filter($evolucao, fn ($m) => $m['renda'] > 0));
        $comGastos = count(array_filter($evolucao, fn ($m) => $m['gastos'] > 0));

        return [
            'renda'            => $renda,
            'gastos'           => $gastos,
            'saldo'            => $saldo,
            'meses'            => count($evolucao),
            'meses_com_renda'  => $comRenda,
            'meses_com_gastos' => $comGastos,
            // A média divide pelos meses do intervalo, não pelos meses com
            // dado: um mês sem gasto nenhum é informação, não é ausência dela.
            'media_renda'      => round($renda / $meses, 2),
            'media_gastos'     => round($gastos / $meses, 2),
            'media_saldo'      => round($saldo / $meses, 2),
            'taxa_economia'    => $renda > 0 ? round(($saldo / $renda) * 100, 1) : 0.0,
        ];
    }

    /**
     * Ranking de categorias no período inteiro.
     *
     * @param  float  $totalGasto
     * @return array<int, array<string, mixed>>
     */
    private function porCategoria(int $userId, CarbonImmutable $de, CarbonImmutable $ate, float $totalGasto): array
    {
        $meses = max(1, $de->diffInMonths($ate) + 1);

        $linhas = Gasto::withoutGlobalScope('doUsuario')
            ->where('gastos.user_id', $userId)
            ->whereBetween('gastos.data', [
                $de->toDateString(),
                $ate->endOfMonth()->toDateString(),
            ])
            /*
             * O ranking é por categoria RAIZ.
             *
             * Um segundo join busca a raiz de cada lançamento: para um gasto em
             * subcategoria, a mãe; para um gasto direto, ela mesma. Sem isso o
             * ranking listaria "Aluguel", "Água" e "Energia" separados, e a
             * pergunta que a tela responde — "onde meu dinheiro foi?" — ficaria
             * espalhada por linhas que somam a mesma coisa.
             */
            ->join('categorias', 'categorias.id', '=', 'gastos.categoria_id')
            ->join('categorias as raizes', 'raizes.id', '=', DB::raw(Categoria::expressaoRaiz()))
            ->groupBy('raizes.id', 'raizes.nome', 'raizes.tipo')
            ->selectRaw('raizes.id as categoria_id, raizes.nome as categoria, raizes.tipo as tipo, SUM(gastos.valor) as total, COUNT(*) as lancamentos')
            ->orderByDesc('total')
            ->get();

        return $linhas->map(function ($linha) use ($totalGasto, $meses) {
            $total = round((float) $linha->total, 2);
            $tipo = TipoCategoria::from($linha->tipo);

            return [
                'categoria_id' => (int) $linha->categoria_id,
                'categoria'    => $linha->categoria,
                'tipo'         => $tipo->value,
                'rotulo_tipo'  => $tipo->rotulo(),
                'total'        => $total,
                'lancamentos'  => (int) $linha->lancamentos,
                'percentual'   => $totalGasto > 0 ? round(($total / $totalGasto) * 100, 1) : 0.0,
                'media_mensal' => round($total / $meses, 2),
            ];
        })->all();
    }

    /**
     * A regra 50/30/20 no acumulado do período.
     *
     * O alvo é calculado sobre a renda SOMADA do intervalo, não sobre a média:
     * é o mesmo número, mas somar deixa explícito que a comparação é entre dois
     * acumulados.
     *
     * @param  array<int, array<string, mixed>>  $evolucao
     * @param  array<string, float|int>  $totais
     * @return array<int, array<string, mixed>>
     */
    private function porTipo(array $evolucao, array $totais): array
    {
        $meses = max(1, count($evolucao));
        $faixas = [];

        foreach (TipoCategoria::cases() as $tipo) {
            $total = round(array_sum(array_column($evolucao, $tipo->value)), 2);
            $alvo = round($totais['renda'] * $tipo->percentual(), 2);

            $faixas[] = [
                'tipo'             => $tipo->value,
                'rotulo'           => $tipo->rotulo(),
                'percentual_regra' => $tipo->percentual(),
                'total'            => $total,
                'alvo'             => $alvo,
                'diferenca'        => round($alvo - $total, 2),
                'media_mensal'     => round($total / $meses, 2),
                // Fatia sobre o gasto total; e sobre o alvo, quando há renda.
                'percentual'       => $totais['gastos'] > 0 ? round(($total / $totais['gastos']) * 100, 1) : 0.0,
                'percentual_alvo'  => $alvo > 0 ? round(($total / $alvo) * 100, 1) : 0.0,
                'percentual_renda' => $totais['renda'] > 0 ? round(($total / $totais['renda']) * 100, 1) : 0.0,
            ];
        }

        return $faixas;
    }

    /**
     * Os extremos do período — o que um gráfico mostra mas ninguém lê de olho.
     *
     * Só meses COM dado disputam "maior" e "menor": um mês vazio venceria
     * sempre o menor gasto e não significaria nada.
     *
     * @param  array{de: CarbonImmutable, ate: CarbonImmutable, ajustado: bool}  $intervalo
     * @param  array<int, array<string, mixed>>  $evolucao
     * @param  array<int, array<string, mixed>>  $categorias
     * @return array<string, mixed>
     */
    private function destaques(int $userId, array $intervalo, array $evolucao, array $categorias): array
    {
        $comGastos = array_values(array_filter($evolucao, fn ($m) => $m['gastos'] > 0));
        $comRenda = array_values(array_filter($evolucao, fn ($m) => $m['renda'] > 0));

        $maior = $this->extremo($comGastos, 'gastos', maior: true);
        $menor = $this->extremo($comGastos, 'gastos', maior: false);
        $melhorSaldo = $this->extremo($comRenda, 'saldo', maior: true);

        $maiorLancamento = Gasto::withoutGlobalScope('doUsuario')
            ->with('categoria')
            ->where('user_id', $userId)
            ->whereBetween('data', [
                $intervalo['de']->toDateString(),
                $intervalo['ate']->endOfMonth()->toDateString(),
            ])
            ->orderByDesc('valor')
            ->orderByDesc('id')
            ->first();

        return [
            'mes_maior_gasto'  => $maior,
            'mes_menor_gasto'  => $menor === $maior ? null : $menor,
            'mes_melhor_saldo' => $melhorSaldo,
            'categoria_lider'  => $categorias[0] ?? null,
            'maior_lancamento' => $maiorLancamento === null ? null : [
                'id'        => $maiorLancamento->id,
                'descricao' => $maiorLancamento->descricao,
                'valor'     => round((float) $maiorLancamento->valor, 2),
                'data'      => CarbonImmutable::parse($maiorLancamento->data)->toDateString(),
                'categoria' => $maiorLancamento->categoria?->nome,
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $meses
     * @return array<string, mixed>|null
     */
    private function extremo(array $meses, string $campo, bool $maior): ?array
    {
        if ($meses === []) {
            return null;
        }

        $escolhido = $meses[0];

        foreach ($meses as $mes) {
            if ($maior ? $mes[$campo] > $escolhido[$campo] : $mes[$campo] < $escolhido[$campo]) {
                $escolhido = $mes;
            }
        }

        return [
            'competencia' => $escolhido['competencia'],
            'rotulo'      => $escolhido['rotulo'],
            'renda'       => $escolhido['renda'],
            'gastos'      => $escolhido['gastos'],
            'saldo'       => $escolhido['saldo'],
        ];
    }
}
