<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Passo 2/3 do isolamento por usuário: migration de DADOS.
 *
 * Regras (aprovadas em A1/A2):
 *  - gastos e salarios sem dono passam a pertencer ao usuário mais antigo,
 *    que é o dono real do banco de desenvolvimento;
 *  - categorias existentes permanecem com user_id NULL (globais);
 *  - competencia é derivada do mês de created_at;
 *  - havendo mais de uma renda na mesma competência, apenas a de maior id
 *    permanece ativa; as demais recebem deleted_at (nada é apagado).
 *
 * Nenhum registro é removido fisicamente. O down() reverte integralmente.
 */
return new class extends Migration
{
    public function up(): void
    {
        $userId = DB::table('users')->orderBy('id')->value('id');

        // Banco sem usuários (ex.: base de testes recém-criada): nada a migrar.
        if ($userId === null) {
            return;
        }

        DB::table('gastos')->whereNull('user_id')->update(['user_id' => $userId]);
        DB::table('salarios')->whereNull('user_id')->update(['user_id' => $userId]);

        $semCompetencia = DB::table('salarios')
            ->whereNull('competencia')
            ->get(['id', 'created_at']);

        foreach ($semCompetencia as $salario) {
            DB::table('salarios')->where('id', $salario->id)->update([
                'competencia' => Carbon::parse($salario->created_at)->startOfMonth()->toDateString(),
            ]);
        }

        // Mantém a renda de maior id em cada (user_id, competencia).
        $ativos = DB::table('salarios')
            ->whereNull('deleted_at')
            ->selectRaw('MAX(id) as id')
            ->groupBy('user_id', 'competencia')
            ->pluck('id');

        DB::table('salarios')
            ->whereNull('deleted_at')
            ->whereNotIn('id', $ativos)
            ->update(['deleted_at' => now()]);
    }

    public function down(): void
    {
        DB::table('salarios')->update([
            'deleted_at'  => null,
            'competencia' => null,
            'user_id'     => null,
        ]);

        DB::table('gastos')->update(['user_id' => null]);
    }
};
