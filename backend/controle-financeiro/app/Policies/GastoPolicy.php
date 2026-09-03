<?php

namespace App\Policies;

use App\Models\Gasto;
use App\Models\User;

class GastoPolicy
{
    public function view(User $user, Gasto $gasto): bool
    {
        return $gasto->user_id === $user->id;
    }

    public function update(User $user, Gasto $gasto): bool
    {
        return $gasto->user_id === $user->id;
    }

    public function delete(User $user, Gasto $gasto): bool
    {
        return $gasto->user_id === $user->id;
    }
}
