<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    public function gastos(): HasMany
    {
        return $this->hasMany(Gasto::class);
    }

    public function salarios(): HasMany
    {
        return $this->hasMany(Salario::class);
    }

    /** Apenas as categorias privadas do usuário — as globais não têm dono. */
    public function categorias(): HasMany
    {
        return $this->hasMany(Categoria::class);
    }
}
