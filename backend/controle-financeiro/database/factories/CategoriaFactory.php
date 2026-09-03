<?php

namespace Database\Factories;

use App\Enums\TipoCategoria;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Categoria>
 */
class CategoriaFactory extends Factory
{
    public function definition(): array
    {
        return [
            // Por padrão a categoria é global; use ->doUsuario($user) para privada.
            'user_id' => null,
            'nome'    => ucfirst($this->faker->unique()->word()),
            'tipo'    => $this->faker->randomElement(TipoCategoria::valores()),
        ];
    }

    public function doTipo(TipoCategoria $tipo): static
    {
        return $this->state(fn () => ['tipo' => $tipo->value]);
    }

    public function doUsuario(int $userId): static
    {
        return $this->state(fn () => ['user_id' => $userId]);
    }
}
