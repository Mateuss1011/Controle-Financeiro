<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Salario>
 */
class SalarioFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'     => User::factory(),
            'valor'       => $this->faker->randomFloat(2, 1000, 10000),
            'competencia' => now()->startOfMonth()->toDateString(),
        ];
    }

    public function naCompetencia(string $anoMes): static
    {
        return $this->state(fn () => ['competencia' => $anoMes . '-01']);
    }
}
