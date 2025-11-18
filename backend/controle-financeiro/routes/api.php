<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GastoController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\SalarioController;

// Rotas públicas (sem autenticação)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// ⚠️ Deixa as rotas livres por enquanto, pra testar
Route::apiResource('categorias', CategoriaController::class);
Route::apiResource('gastos', GastoController::class);
Route::apiResource('salarios', SalarioController::class);
Route::get('/regra', [SalarioController::class, 'regra']);


// Quando tudo estiver testado e funcionando,
// volta o middleware assim:
//
// Route::middleware('auth:sanctum')->group(function () {
//     Route::post('/logout', [AuthController::class, 'logout']);
//     Route::apiResource('gastos', GastoController::class);
//     Route::apiResource('categorias', CategoriaController::class);
//     Route::apiResource('salarios', SalarioController::class);
// });
