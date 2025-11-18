<?php

namespace Database\Factories;

use App\Models\Categoria;
use App\Models\Salario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Gasto>
 */
class GastoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'descricao' => $this->faker->sentence(3),
            'valor' => $this->faker->randomFloat(2, 10, 1000),
            'data' => $this->faker->date(),
           // 'categoria' => $this->faker->word(),//
            'categoria_id' => Categoria::factory(),
            'salario_id' => Salario::factory(),
        ];
    }
}
