<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Apenas as categorias globais. Os seeders de salário e gasto usavam
        // factories e geravam dados aleatórios, que não fazem sentido num banco
        // com dados reais do usuário.
        $this->call([
            CategoriaSeeder::class,
        ]);
    }
}
