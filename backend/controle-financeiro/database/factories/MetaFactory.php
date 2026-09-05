<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Meta>
 */
class MetaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'        => User::factory(),
            'nome'           => 'Reserva de emergência',
            'valor_objetivo' => 10000,
            'valor_atual'    => 0,
            'prazo'          => null,
            'concluida_em'   => null,
        ];
    }

    public function comPrazo(string $data): static
    {
        return $this->state(fn () => ['prazo' => $data]);
    }

    public function concluida(): static
    {
        return $this->state(fn (array $atributos) => [
            'valor_atual'  => $atributos['valor_objetivo'],
            'concluida_em' => now(),
        ]);
    }
}
