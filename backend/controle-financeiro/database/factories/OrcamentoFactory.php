<?php

namespace Database\Factories;

use App\Models\Categoria;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Orcamento>
 */
class OrcamentoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'categoria_id' => Categoria::factory(),
            // Por padrão recorrente; use ->naCompetencia() para um mês específico.
            'competencia'  => null,
            'valor_limite' => $this->faker->randomFloat(2, 100, 2000),
        ];
    }

    public function naCompetencia(string $anoMes): static
    {
        return $this->state(fn () => ['competencia' => $anoMes . '-01']);
    }
}
