<?php

namespace Database\Seeders;

use App\Enums\TipoCategoria;
use App\Models\Categoria;
use Illuminate\Database\Seeder;

/**
 * Categorias globais do sistema (user_id NULL), disponíveis a todos os usuários.
 *
 * Idempotente: pode ser executado novamente sem duplicar as categorias que já
 * existem no banco de desenvolvimento.
 */
class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            ['Alimentação (Supermercado)',   TipoCategoria::Necessidade],
            ['Moradia (Aluguel, Contas)',    TipoCategoria::Necessidade],
            ['Transporte (Gasolina, App)',   TipoCategoria::Necessidade],
            ['Lazer (Restaurante, Cinema)',  TipoCategoria::Desejo],
            ['Delivery (iFood, etc)',        TipoCategoria::Desejo],
            ['Investimentos',                TipoCategoria::Poupanca],
            ['Outros',                       TipoCategoria::Necessidade],
        ];

        foreach ($categorias as [$nome, $tipo]) {
            Categoria::withoutGlobalScopes()->updateOrCreate(
                ['nome' => $nome, 'user_id' => null],
                ['tipo' => $tipo->value],
            );
        }
    }
}
