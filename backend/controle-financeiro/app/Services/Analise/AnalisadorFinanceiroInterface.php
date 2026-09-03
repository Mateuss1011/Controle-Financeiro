<?php

namespace App\Services\Analise;

/**
 * Contrato de geração de insights sobre um período.
 *
 * É o ponto de extensão previsto para IA. Hoje existe uma única implementação,
 * AnalisadorPorRegras, inteiramente determinística. Amanhã um AnalisadorPorIA
 * pode ser registrado no container sem que DashboardController, DashboardService
 * ou qualquer componente React precisem mudar — eles dependem desta interface,
 * não da implementação.
 *
 * O contexto chega pronto, já calculado pelos serviços financeiros: o analisador
 * interpreta números, não consulta o banco. Isso mantém a regra de negócio em um
 * lugar só e torna qualquer implementação futura testável sem infraestrutura.
 */
interface AnalisadorFinanceiroInterface
{
    /**
     * @param  array<string, mixed>  $contexto  Resumo, faixas da regra, ritmo, comparação e categorias.
     * @return array<int, array{tipo: string, titulo: string, mensagem: string, severidade: string, contexto: array<string, mixed>}>
     */
    public function analisar(array $contexto): array;
}
