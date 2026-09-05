<?php

namespace App\Policies;

use App\Models\Orcamento;
use App\Models\User;

class OrcamentoPolicy
{
    public function view(User $user, Orcamento $orcamento): bool
    {
        return $orcamento->user_id === $user->id;
    }

    public function update(User $user, Orcamento $orcamento): bool
    {
        return $orcamento->user_id === $user->id;
    }

    public function delete(User $user, Orcamento $orcamento): bool
    {
        return $orcamento->user_id === $user->id;
    }
}
