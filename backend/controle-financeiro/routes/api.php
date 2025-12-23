<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GastoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\SalarioController;


Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


Route::apiResource('categorias', CategoriaController::class);
Route::apiResource('gastos', GastoController::class);
Route::apiResource('salarios', SalarioController::class);
Route::get('/regra', [SalarioController::class, 'regra']);

