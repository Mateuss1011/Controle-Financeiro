<?php

namespace App\Policies;

use App\Models\Categoria;
use App\Models\User;

class CategoriaPolicy
{
    /** Globais são visíveis a todos; privadas, só ao dono. */
    public function view(User $user, Categoria $categoria): bool
    {
        return $categoria->ehGlobal() || $categoria->user_id === $user->id;
    }

    /** Categorias globais são do sistema e não podem ser editadas pelo usuário. */
    public function update(User $user, Categoria $categoria): bool
    {
        return $categoria->user_id === $user->id;
    }

    public function delete(User $user, Categoria $categoria): bool
    {
        return $categoria->user_id === $user->id;
    }
}
