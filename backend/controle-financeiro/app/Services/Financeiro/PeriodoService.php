<?php

namespace App\Services\Financeiro;

use App\Models\Gasto;
use App\Models\Salario;
use Carbon\CarbonImmutable;

/**
 * Tudo que envolve "qual é o período" fica aqui.
 *
 * O produto trabalha por competência: o dia 1 do mês de referência. Um gasto
 * pertence à competência da sua `data`; uma renda, à sua `competencia`. Nunca
 * se misturam dados de meses diferentes numa mesma leitura.
 */
class PeriodoService
{
    public const FORMATO = 'Y-m';

    private const MESES = [
        1 => 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];

    public function atual(): CarbonImmutable
    {
        return CarbonImmutable::now()->startOfMonth();
    }

    public function daString(?string $competencia): ?CarbonImmutable
    {
        if ($competencia === null || $competencia === '') {
            return null;
        }

        if (! CarbonImmutable::canBeCreatedFromFormat($competencia, self::FORMATO)) {
            return null;
        }

        return CarbonImmutable::createFromFormat(self::FORMATO, $competencia)->startOfMonth();
    }

    public function rotulo(CarbonImmutable $competencia): string
    {
        return self::MESES[$competencia->month] . ' de ' . $competencia->year;
    }

    /**
     * Competência mais recente em que o usuário tem QUALQUER dado — renda ou
     * gasto. É o que resolve o problema de abrir o produto num mês vazio só
     * porque o calendário virou.
     */
    public function maisRecenteComDados(int $userId): ?CarbonImmutable
    {
        $candidatas = [];

        $renda = Salario::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->max('competencia');

        if ($renda) {
            $candidatas[] = CarbonImmutable::parse($renda)->startOfMonth();
        }

        $gasto = Gasto::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->max('data');

        if ($gasto) {
            $candidatas[] = CarbonImmutable::parse($gasto)->startOfMonth();
        }

        if ($candidatas === []) {
            return null;
        }

        usort($candidatas, fn ($a, $b) => $b <=> $a);

        return $candidatas[0];
    }

    /**
     * Competências com dado, da mais recente para a mais antiga. Alimenta o
     * seletor de mês: melhor oferecer os períodos que existem do que um
     * calendário livre que quase sempre cai num mês vazio.
     *
     * @return array<int, string>
     */
    public function comDados(int $userId, int $limite = 24): array
    {
        $rendas = Salario::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->pluck('competencia')
            ->map(fn ($data) => CarbonImmutable::parse($data)->format(self::FORMATO));

        $gastos = Gasto::withoutGlobalScope('doUsuario')
            ->where('user_id', $userId)
            ->pluck('data')
            ->map(fn ($data) => CarbonImmutable::parse($data)->format(self::FORMATO));

        $competencias = $rendas->concat($gastos)->unique()->sortDesc()->values();

        return $competencias->take($limite)->all();
    }

    /**
     * Quanto do período já passou.
     *
     * Para um mês passado o período está encerrado (0 dias restantes); para um
     * mês futuro ele ainda nem começou (nenhum dia decorrido).
     *
     * @return array{inicio: string, fim: string, dias: int, dias_decorridos: int, dias_restantes: int, encerrado: bool, futuro: bool, corrente: bool}
     */
    public function progresso(CarbonImmutable $competencia): array
    {
        $hoje = CarbonImmutable::now()->startOfDay();
        $inicio = $competencia->startOfMonth();
        $fim = $competencia->endOfMonth()->startOfDay();
        $dias = (int) $competencia->daysInMonth;

        $corrente = $hoje->between($inicio, $fim);
        $encerrado = $hoje->greaterThan($fim);
        $futuro = $hoje->lessThan($inicio);

        $decorridos = match (true) {
            $futuro    => 0,
            $encerrado => $dias,
            default    => (int) $hoje->day,
        };

        return [
            'inicio'          => $inicio->toDateString(),
            'fim'             => $fim->toDateString(),
            'dias'            => $dias,
            'dias_decorridos' => $decorridos,
            'dias_restantes'  => max(0, $dias - $decorridos),
            'encerrado'       => $encerrado,
            'futuro'          => $futuro,
            'corrente'        => $corrente,
        ];
    }
}
