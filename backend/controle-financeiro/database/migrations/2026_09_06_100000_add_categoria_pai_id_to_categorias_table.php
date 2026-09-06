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
 * O índice único passa a incluir o pai. Sem isso, "Manutenção" só poderia
 * existir em um lugar do catálogo, quando ela é legítima tanto em Moradia
 * quanto em Transporte. A garantia de verdade contra duplicidade continua sendo
 * `Categoria::normalizarNome()` na aplicação, que cobre caixa e acento — o
 * índice é rede contra concorrência, e no MariaDB nem alcança as principais,
 * porque NULLs são distintos num índice único.
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
            $table->dropUnique('categorias_user_id_nome_unique');
            $table->unique(
                ['user_id', 'categoria_pai_id', 'nome'],
                'categorias_user_pai_nome_unique'
            );
        });
    }

    public function down(): void
    {
        // Volta ao índice plano ANTES de largar a coluna: o único novo depende
        // dela. Subcategorias com nome repetido entre pais diferentes fariam a
        // recriação do índice antigo falhar — e falhar é o certo, porque
        // reverter com esse dado significaria escolher qual linha perder.
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropUnique('categorias_user_pai_nome_unique');
            $table->unique(['user_id', 'nome'], 'categorias_user_id_nome_unique');
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->dropIndex('categorias_pai_nome_index');
            $table->dropConstrainedForeignId('categoria_pai_id');
        });
    }
};
