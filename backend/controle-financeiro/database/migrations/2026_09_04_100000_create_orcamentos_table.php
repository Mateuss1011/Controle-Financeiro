<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Limites de gasto por categoria.
 *
 * `competencia` NULL identifica um orçamento RECORRENTE: vale para todo mês em
 * que não exista um orçamento específico daquela categoria. Assim o usuário
 * define "Alimentação: R$ 800" uma vez e só cria exceções quando precisa —
 * dezembro, férias, um mês atípico.
 *
 * Sobre a unicidade: MariaDB 10.4 trata NULLs como distintos num índice único,
 * então unique(user_id, categoria_id, competencia) NÃO impediria dois
 * recorrentes para a mesma categoria. A unicidade é garantida no
 * OrcamentoService, pelo mesmo motivo e da mesma forma que em salarios; aqui
 * fica o índice composto que serve as consultas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orcamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('categoria_id')->constrained('categorias')->cascadeOnDelete();
            $table->date('competencia')->nullable();
            $table->decimal('valor_limite', 10, 2);
            $table->timestamps();

            $table->index(['user_id', 'competencia']);
            $table->index(['user_id', 'categoria_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orcamentos');
    }
};
