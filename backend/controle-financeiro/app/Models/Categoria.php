<?php

namespace App\Models;

use App\Enums\TipoCategoria;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

/**
 * Categoria de gasto, classificada pela regra 50/30/20.
 *
 * user_id NULL = categoria global (padrão do sistema, visível a todos).
 * user_id preenchido = categoria privada daquele usuário.
 *
 * Por isso Categoria NÃO usa a trait BelongsToUser: o escopo não é "só o que é
 * meu", e sim "o que é meu OU global".
 */
class Categoria extends Model
{
    /** @use HasFactory<\Database\Factories\CategoriaFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'nome',
        'tipo',
    ];

    protected function casts(): array
    {
        return [
            'tipo' => TipoCategoria::class,
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('visiveis', function (Builder $query) {
            if (Auth::hasUser()) {
                $id = Auth::id();

                $query->where(fn (Builder $q) => $q
                    ->whereNull('categorias.user_id')
                    ->orWhere('categorias.user_id', $id));

                return;
            }

            if (! app()->runningInConsole()) {
                $query->whereRaw('1 = 0');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gastos(): HasMany
    {
        return $this->hasMany(Gasto::class);
    }

    public function ehGlobal(): bool
    {
        return $this->user_id === null;
    }

    public function scopeGlobais(Builder $query): Builder
    {
        return $query->whereNull('user_id');
    }

    public function scopeDoTipo(Builder $query, TipoCategoria $tipo): Builder
    {
        return $query->where('tipo', $tipo->value);
    }
}
