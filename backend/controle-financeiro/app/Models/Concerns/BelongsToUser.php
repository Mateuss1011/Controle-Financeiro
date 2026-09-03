<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Isolamento por usuário na camada do model.
 *
 * Primeira linha de defesa: toda consulta é automaticamente filtrada pelo
 * usuário autenticado e todo registro criado recebe o dono corrente. As
 * Policies são a segunda linha; nenhuma das duas depende da outra.
 *
 * Em contexto HTTP sem usuário autenticado a consulta falha fechada (não
 * retorna nada) em vez de vazar a tabela inteira. No console (migrations,
 * seeders, tinker, testes) o escopo não se aplica.
 */
trait BelongsToUser
{
    protected static function bootBelongsToUser(): void
    {
        static::addGlobalScope('doUsuario', function (Builder $query) {
            $tabela = $query->getModel()->getTable();

            if (Auth::hasUser()) {
                $query->where($tabela . '.user_id', Auth::id());

                return;
            }

            if (! app()->runningInConsole()) {
                $query->whereRaw('1 = 0');
            }
        });

        static::creating(function ($model) {
            if (empty($model->user_id) && Auth::hasUser()) {
                $model->user_id = Auth::id();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
