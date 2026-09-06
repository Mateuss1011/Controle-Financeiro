<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hierarquia de dois níveis nas categorias: categoria e subcategoria.
 *
 * `categoria_pai_id` nulo = categoria principal; preenchido = subcategoria.
 * Não há terceiro nível: a aplicação recusa apontar o pai para quem já tem pai,
 * e há teste para isso. A restrição não está no schema porque o MariaDB não
 * suporta CHECK com subconsulta.
 *
 * A coluna é ADITIVA e nenhuma linha de `gastos` é tocada: um lançamento
 * continua apontando para `categoria_id`, seja ele uma categoria principal ou
 * uma subcategoria. Foi essa a razão de manter a hierarquia na mesma tabela em
 * vez de criar uma tabela de subcategorias — os lançamentos que já existem
 * seguem válidos sem reescrita.
 *
 * ORDEM DOS ÍNDICES: o único novo é criado ANTES de o antigo sair. Não é
 * capricho — o `(user_id, nome)` antigo é o índice que dá suporte à foreign key
 * `user_id → users`, e o MariaDB recusa removê-lo enquanto for o único que
 * serve à FK ("needed in a foreign key constraint"). Criando o novo primeiro,
 * que também começa por `user_id`, a FK nunca fica descoberta. O SQLite dos
 * testes não faz essa exigência, então a ordem errada passaria na suíte e
 * quebraria só em produção.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->foreignId('categoria_pai_id')
                ->nullable()
                ->after('user_id')
                ->constrained('categorias')
                ->cascadeOnDelete();

            $table->index(['categoria_pai_id', 'nome'], 'categorias_pai_nome_index');
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->unique(
                ['user_id', 'categoria_pai_id', 'nome'],
                'categorias_user_pai_nome_unique'
            );
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->dropUnique('categorias_user_id_nome_unique');
        });
    }

    public function down(): void
    {
        // Mesma lógica ao contrário: o índice antigo volta antes de o novo sair,
        // pela mesma razão de suporte à foreign key.
        Schema::table('categorias', function (Blueprint $table) {
            $table->unique(['user_id', 'nome'], 'categorias_user_id_nome_unique');
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->dropUnique('categorias_user_pai_nome_unique');
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->dropIndex('categorias_pai_nome_index');
            $table->dropConstrainedForeignId('categoria_pai_id');
        });
    }
};
