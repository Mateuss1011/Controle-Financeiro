<?php

namespace App\Services\Financeiro;

use App\Models\Gasto;
use App\Services\Analise\AnalisadorFinanceiroInterface;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Monta o Dashboard inteiro numa única passagem.
 *
 * Existe um endpoint agregado em vez de seis chamadas independentes porque a
 * tela precisa das partes juntas para ser coerente: resumo, regra, saúde,
 * capacidade e insights têm que falar da MESMA competência. Buscar cada peça
 * separadamente abriria espaço para a tela mostrar meses diferentes lado a lado
 * durante o carregamento.
 *
 * Nenhum cálculo é repetido no React — o frontend consome, formata e exibe.
 */
class DashboardService
{
    public function __construct(
        private readonly PeriodoService $periodos,
        private readonly RendaService $rendas,
        private readonly RegraCincoTrintaVinteService $regra,
        private readonly SaudeFinanceiraService $saude,
        private readonly CapacidadeDeGastoService $capacidade,
        private readonly OrcamentoService $orcamentos,
        private readonly MetaService $metas,
        private readonly AnalisadorFinanceiroInterface $analisador,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function montar(int $userId, ?string $competenciaPedida): array
    {
        $pedida = $this->periodos->daString($competenciaPedida);
        $maisRecente = $this->periodos->maisRecenteComDados($userId);

        // Sem competência pedida, abrimos no período mais recente COM dados.
        // Sem isso, quem registrou tudo em dezembro e volta em setembro do ano
        // seguinte encontraria uma tela vazia sem entender por quê.
        $competencia = $pedida ?? $maisRecente ?? $this->periodos->atual();
        $ajustada = $pedida === null && $maisRecente !== null && ! $maisRecente->equalTo($this->periodos->atual());

        $lancamentos = $this->lancamentosDa($userId, $competencia);
        $resumo = $this->resumo($userId, $competencia, $lancamentos);
        $regra = $this->regra->calcular($userId, $competencia);
        $categorias = $this->porCategoria($lancamentos, $resumo['gastos']);
        $comparacao = $this->comparacao($userId, $competencia, $resumo);
        $ritmo = $this->capacidade->ritmo($userId, $competencia);
        $orcamentos = $this->orcamentos->paraCompetencia($userId, $competencia);
        $metas = $this->metas->listar($userId);
        $capacidade = $this->capacidade->calcular($userId, $competencia);

        $contexto = [
            'resumo'            => $resumo,
            'regra'             => $regra,
            'categorias'        => $categorias,
            'comparacao'        => $comparacao,
            'ritmo'             => $ritmo,
            'orcamentos'        => $orcamentos,
            'metas'             => $metas,
            'capacidade'        => $capacidade,
            'total_lancamentos' => $lancamentos->count(),
        ];

        return [
            'competencia'            => $competencia->format(PeriodoService::FORMATO),
            'competencia_rotulo'     => $this->periodos->rotulo($competencia),
            'competencia_ajustada'   => $ajustada,
            'competencias_com_dados' => $this->periodos->comDados($userId),
            'periodo'                => $this->periodos->progresso($competencia),
            'primeira_sessao'        => $maisRecente === null,
            'tem_dados'              => $resumo['renda'] > 0 || $lancamentos->isNotEmpty(),
            'total_lancamentos'      => $lancamentos->count(),
            'resumo'                 => $resumo,
            'comparacao'             => $comparacao,
            'saude'                  => $this->saude->calcular($userId, $competencia, $lancamentos->count()),
            'regra'                  => $regra,
            'capacidade'             => $capacidade,
            'ritmo'                  => $ritmo,
            'orcamentos'             => $orcamentos,
            'metas'                  => $metas,
            'categorias'             => $categorias,
            'ultimos_lancamentos'    => $lancamentos->sortByDesc('data')->take(5)->values(),
            'insights'               => $this->analisador->analisar($contexto),
        ];
    }

    /** @return Collection<int, Gasto> */
    private function lancamentosDa(int $userId, CarbonImmutable $competencia): Collection
    {
        return Gasto::withoutGlobalScope('doUsuario')
            // `categoria.pai` junto: sem ele, agrupar pela raiz dispararia uma
            // consulta por lançamento de subcategoria — N+1 clássico.
            ->with('categoria.pai')
            ->where('user_id', $userId)
            ->daCompetencia($competencia->year, $competencia->month)
            ->orderByDesc('data')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  Collection<int, Gasto>  $lancamentos
     * @return array<string, float|int>
     */
    private function resumo(int $userId, CarbonImmutable $competencia, Collection $lancamentos): array
    {
        $renda = $this->rendas->valorDaCompetencia($userId, $competencia);
        $gastos = (float) $lancamentos->sum(fn (Gasto $g) => (float) $g->valor);
        $saldo = $renda - $gastos;

        return [
            'renda'                   => round($renda, 2),
            'gastos'                  => round($gastos, 2),
            'saldo'                   => round($saldo, 2),
            // Sem renda não existe "taxa de economia": 0 aqui é ausência de
            // base, e a interface trata o caso pelo `renda`.
            'taxa_economia'           => $renda > 0 ? round(($saldo / $renda) * 100, 1) : 0.0,
            'percentual_renda_gasto'  => $renda > 0 ? round(($gastos / $renda) * 100, 1) : 0.0,
        ];
    }

    /**
     * @param  Collection<int, Gasto>  $lancamentos
     * @return array<int, array<string, mixed>>
     */
    private function porCategoria(Collection $lancamentos, float $total): array
    {
        /*
         * Agrupa pela categoria RAIZ, não pela categoria exata do lançamento.
         *
         * Com subcategorias, agrupar pelo `categoria_id` pulverizaria o donut:
         * "Moradia" viraria três fatias finas — Aluguel, Água, Energia — e a
         * leitura de relance, que é a razão de existir do gráfico, se perderia.
         * A subcategoria é detalhe; a categoria é a unidade de comparação.
         */
        return $lancamentos
            ->groupBy(fn (Gasto $g) => $g->categoria?->raizId())
            ->map(function (Collection $doGrupo) use ($total) {
                $categoria = $doGrupo->first()->categoria;
                // A raiz é quem dá nome ao grupo; `pai` já vem carregado.
                $raiz = $categoria?->pai ?? $categoria;
                $soma = (float) $doGrupo->sum(fn (Gasto $g) => (float) $g->valor);

                return [
                    'categoria_id' => $raiz?->id,
                    'categoria'    => $raiz?->nome ?? 'Sem categoria',
                    'tipo'         => $raiz?->tipo->value,
                    'total'        => round($soma, 2),
                    'percentual'   => $total > 0 ? round(($soma / $total) * 100, 1) : 0.0,
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->all();
    }

    /**
     * Comparação com a competência anterior.
     *
     * Só é oferecida quando o mês anterior tem base real. Comparar contra um
     * mês vazio produziria "+100%" para qualquer valor, o que não informa nada.
     *
     * @param  array<string, float|int>  $resumo
     * @return array<string, mixed>
     */
    private function comparacao(int $userId, CarbonImmutable $competencia, array $resumo): array
    {
        $anterior = $competencia->subMonth()->startOfMonth();

        $lancamentosAnteriores = $this->lancamentosDa($userId, $anterior);
        $resumoAnterior = $this->resumo($userId, $anterior, $lancamentosAnteriores);

        $temBase = $resumoAnterior['renda'] > 0 || $lancamentosAnteriores->isNotEmpty();

        if (! $temBase) {
            return [
                'disponivel'             => false,
                'motivo'                 => 'sem_periodo_anterior',
                'competencia_anterior'   => $anterior->format(PeriodoService::FORMATO),
            ];
        }

        return [
            'disponivel'           => true,
            'motivo'               => null,
            'competencia_anterior' => $anterior->format(PeriodoService::FORMATO),
            'renda'                => $this->variacao($resumo['renda'], $resumoAnterior['renda']),
            'gastos'               => $this->variacao($resumo['gastos'], $resumoAnterior['gastos']),
            'saldo'                => $this->variacao($resumo['saldo'], $resumoAnterior['saldo']),
            // Taxa de economia já é percentual: a diferença se lê em pontos
            // percentuais, não em variação percentual de percentual.
            'taxa_economia'        => [
                'anterior'            => $resumoAnterior['taxa_economia'],
                'atual'               => $resumo['taxa_economia'],
                'variacao_percentual' => null,
                'variacao_pontos'     => round($resumo['taxa_economia'] - $resumoAnterior['taxa_economia'], 1),
            ],
        ];
    }

    /**
     * Variação percentual protegida: base zero (ou de sinal oposto) não gera
     * percentual, apenas a diferença absoluta.
     *
     * @return array<string, float|null>
     */
    private function variacao(float $atual, float $anterior): array
    {
        $podeCalcular = $anterior > 0 && $atual >= 0;

        return [
            'anterior'            => round($anterior, 2),
            'atual'               => round($atual, 2),
            'variacao_absoluta'   => round($atual - $anterior, 2),
            'variacao_percentual' => $podeCalcular
                ? round((($atual - $anterior) / $anterior) * 100, 1)
                : null,
        ];
    }
}
