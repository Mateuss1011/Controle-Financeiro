<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Salario extends Model
{
    /** @use HasFactory<\Database\Factories\SalarioFactory> */
    use HasFactory;

    protected $fillable = [
        'valor'
    ];

    public function gastos()
    {
        return $this->hasMany(Gasto::class);
    }
}
