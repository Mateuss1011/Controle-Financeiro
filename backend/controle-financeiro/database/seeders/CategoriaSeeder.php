<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Categoria; // 👈 Você já tem isso, ótimo!

class CategoriaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Vamos trocar a factory por dados reais
        // Categoria::factory(10)->create(); 👈 Comente ou apague esta linha

        // E adicione as categorias que você realmente usa:
        Categoria::create([
            'nome' => 'Alimentação (Supermercado)',
            'tipo' => 'necessidade'
        ]);

        Categoria::create([
            'nome' => 'Moradia (Aluguel, Contas)',
            'tipo' => 'necessidade'
        ]);

        Categoria::create([
            'nome' => 'Transporte (Gasolina, App)',
            'tipo' => 'necessidade'
        ]);

        Categoria::create([
            'nome' => 'Lazer (Restaurante, Cinema)',
            'tipo' => 'desejo'
        ]);

        Categoria::create([
            'nome' => 'Delivery (iFood, etc)',
            'tipo' => 'desejo'
        ]);

        Categoria::create([
            'nome' => 'Investimentos',
            'tipo' => 'poupanca'
        ]);

        Categoria::create([
            'nome' => 'Outros',
            'tipo' => 'necessidade'
        ]);
    }
}
