<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A renda deixa de ser "o último registro criado" e passa a ter competência
 * explícita (sempre o dia 1 do mês de referência).
 *
 * SoftDeletes entra para permitir desativar registros duplicados sem apagar
 * dado real do usuário — a operação é reversível com um UPDATE.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salarios', function (Blueprint $table) {
            $table->date('competencia')->nullable();
            $table->string('descricao', 255)->nullable();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('salarios', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn(['competencia', 'descricao']);
        });
    }
};
