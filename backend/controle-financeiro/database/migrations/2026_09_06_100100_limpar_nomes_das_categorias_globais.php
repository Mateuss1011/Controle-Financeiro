<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tira a taxonomia de dentro do nome das categorias globais.
 *
 * "Moradia (Aluguel, Contas)" era uma categoria fingindo ser três. O parêntese
 * existia porque não havia onde colocar a subdivisão; agora há, e o nome pode
 * voltar a ser só o nome.
 *
 * A renomeação é POR ID, e não por nome: preserva a chave, e com ela todos os
 * vínculos. Nenhuma linha de `gastos` é tocada — um lançamento em
 * "Moradia (Aluguel, Contas)" continua sendo um lançamento em "Moradia", com o
 * mesmo id de categoria. O que muda é o rótulo que a pessoa lê.
 *
 * Lançamentos NÃO são reclassificados para subcategorias. Decidir que "Conta de
 * Luz" pertence a "Energia elétrica" é leitura de intenção, e errar isso em
 * massa é pior do que deixar como está: quem lançou sabe, e reclassifica quando
 * quiser.
 *
 * Só renomeia se o nome antigo ainda estiver lá. Um banco onde alguém já
 * ajustou o nome à mão passa intacto.
 */
return new class extends Migration
{
    /** @var array<string, string> */
    private const RENOMEACOES = [
        'Alimentação (Supermercado)'  => 'Alimentação',
        'Moradia (Aluguel, Contas)'   => 'Moradia',
        'Transporte (Gasolina, App)'  => 'Transporte',
        'Lazer (Restaurante, Cinema)' => 'Entretenimento',
        'Delivery (iFood, etc)'       => 'Delivery',
        'Outros'                      => 'Outros essenciais',
    ];

    public function up(): void
    {
        foreach (self::RENOMEACOES as $antigo => $novo) {
            DB::table('categorias')
                ->whereNull('user_id')
                ->whereNull('categoria_pai_id')
                ->where('nome', $antigo)
                ->update(['nome' => $novo, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        foreach (self::RENOMEACOES as $antigo => $novo) {
            DB::table('categorias')
                ->whereNull('user_id')
                ->whereNull('categoria_pai_id')
                ->where('nome', $novo)
                ->update(['nome' => $antigo, 'updated_at' => now()]);
        }
    }
};
