<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Meta extends Model
{
    /** @use HasFactory<\Database\Factories\MetaFactory> */
    use BelongsToUser, HasFactory;

    protected $table = 'metas';

    protected $fillable = [
        'user_id',
        'nome',
        'valor_objetivo',
        'valor_atual',
        'prazo',
        'concluida_em',
    ];

    protected function casts(): array
    {
        return [
            'prazo'          => 'date',
            'concluida_em'   => 'datetime',
            'valor_objetivo' => 'decimal:2',
            'valor_atual'    => 'decimal:2',
        ];
    }

    public function estaConcluida(): bool
    {
        return (float) $this->valor_atual >= (float) $this->valor_objetivo;
    }

    /** Só metas com prazo geram compromisso mensal. */
    public function scopeComPrazo(Builder $query): Builder
    {
        return $query->whereNotNull('prazo');
    }
}
