<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Renda mensal do usuário.
 *
 * A tabela mantém o nome `salarios` (decisão A5); na linguagem do produto o
 * conceito se chama "Renda". Cada registro pertence a uma competência — o dia 1
 * do mês de referência — e só existe uma renda ativa por competência.
 */
class Salario extends Model
{
    /** @use HasFactory<\Database\Factories\SalarioFactory> */
    use BelongsToUser, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'valor',
        'competencia',
        'descricao',
    ];

    protected function casts(): array
    {
        return [
            'competencia' => 'date',
            'valor'       => 'decimal:2',
        ];
    }

    public function gastos(): HasMany
    {
        return $this->hasMany(Gasto::class);
    }

    public function scopeDaCompetencia(Builder $query, int $ano, int $mes): Builder
    {
        return $query->whereYear('competencia', $ano)->whereMonth('competencia', $mes);
    }
}
