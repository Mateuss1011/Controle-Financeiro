<?php

namespace Database\Factories;

use App\Models\Categoria;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Gasto>
 */
class GastoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'descricao'    => $this->faker->sentence(3),
            'valor'        => $this->faker->randomFloat(2, 10, 1000),
            'data'         => now()->toDateString(),
            'categoria_id' => Categoria::factory(),
            'salario_id'   => null,
        ];
    }
}
