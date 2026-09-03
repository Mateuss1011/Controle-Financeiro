<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Passo 3/3 do isolamento por usuário: agora que todas as linhas têm dono,
 * a coluna vira obrigatória e entram os índices de consulta.
 *
 * Sobre a unicidade da renda por competência: MariaDB 10.4 não suporta índice
 * único parcial, e um único em (user_id, competencia, deleted_at) NÃO resolveria,
 * porque o padrão SQL trata NULLs como distintos — várias linhas ativas
 * (deleted_at NULL) continuariam passando. A unicidade das rendas ativas é
 * garantida na camada de aplicação (RendaService + FormRequest). Aqui fica
 * apenas o índice composto que serve as consultas por período.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salarios', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->date('competencia')->nullable(false)->change();
            $table->index(['user_id', 'competencia']);
        });

        Schema::table('gastos', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->index(['user_id', 'data']);
            $table->index(['user_id', 'categoria_id']);
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->unique(['user_id', 'nome']);
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'nome']);
        });

        Schema::table('gastos', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'categoria_id']);
            $table->dropIndex(['user_id', 'data']);
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });

        Schema::table('salarios', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'competencia']);
            $table->date('competencia')->nullable()->change();
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }
};
