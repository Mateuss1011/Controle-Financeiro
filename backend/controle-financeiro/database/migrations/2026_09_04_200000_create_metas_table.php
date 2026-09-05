<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Objetivos financeiros do usuário.
 *
 * `prazo` é opcional de propósito: "juntar R$ 10.000 para a reserva de
 * emergência" é uma meta legítima mesmo sem data. Só metas COM prazo geram
 * compromisso mensal — sem data não há como inferir urgência, e inventar uma
 * seria pior que não ter.
 *
 * `valor_atual` é o acumulado, não um aporte do mês. Isso evita precisar de uma
 * tabela de aportes: o aporte mensal necessário é recalculado a cada consulta
 * como (objetivo − atual) ÷ meses restantes, e se corrige sozinho conforme o
 * usuário atualiza o acumulado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('metas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nome', 120);
            $table->decimal('valor_objetivo', 12, 2);
            $table->decimal('valor_atual', 12, 2)->default(0);
            $table->date('prazo')->nullable();
            $table->timestamp('concluida_em')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'prazo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('metas');
    }
};
