<?php

namespace App\Policies;

use App\Models\Salario;
use App\Models\User;

class SalarioPolicy
{
    public function view(User $user, Salario $salario): bool
    {
        return $salario->user_id === $user->id;
    }

    public function update(User $user, Salario $salario): bool
    {
        return $salario->user_id === $user->id;
    }

    public function delete(User $user, Salario $salario): bool
    {
        return $salario->user_id === $user->id;
    }
}
