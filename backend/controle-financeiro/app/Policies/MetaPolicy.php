<?php

namespace App\Policies;

use App\Models\Meta;
use App\Models\User;

class MetaPolicy
{
    public function view(User $user, Meta $meta): bool
    {
        return $meta->user_id === $user->id;
    }

    public function update(User $user, Meta $meta): bool
    {
        return $meta->user_id === $user->id;
    }

    public function delete(User $user, Meta $meta): bool
    {
        return $meta->user_id === $user->id;
    }
}
