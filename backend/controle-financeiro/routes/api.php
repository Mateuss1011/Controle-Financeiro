<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GastoController;
use App\Http\Controllers\MetaController;
use App\Http\Controllers\OrcamentoController;
use App\Http\Controllers\PerfilController;
use App\Http\Controllers\RegraController;
use App\Http\Controllers\RelatorioController;
use App\Http\Controllers\RendaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotas da API
|--------------------------------------------------------------------------
|
| Carregadas uma única vez, pelo slot `api:` do bootstrap/app.php, com o
| prefixo /api e o middleware group `api`. Toda rota que toca dado financeiro
| exige auth:sanctum — não há exceção.
|
*/

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:autenticacao');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:autenticacao');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // A própria conta. Sem {id} na URL de propósito: o alvo é sempre o dono do
    // token, então não existe id para manipular.
    Route::patch('/perfil', [PerfilController::class, 'update']);
    Route::put('/perfil/senha', [PerfilController::class, 'atualizarSenha'])
        ->middleware('throttle:autenticacao');

    Route::apiResource('gastos', GastoController::class);
    Route::apiResource('categorias', CategoriaController::class);

    // Precisa vir antes do apiResource para não ser capturada por /rendas/{renda}.
    Route::get('/rendas/competencia/{competencia}', [RendaController::class, 'daCompetencia']);
    Route::apiResource('rendas', RendaController::class)
        ->only(['index', 'store', 'show', 'destroy'])
        ->parameters(['rendas' => 'renda']);

    Route::apiResource('orcamentos', OrcamentoController::class)
        ->only(['index', 'store', 'destroy']);

    Route::apiResource('metas', MetaController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('/regra', RegraController::class);

    // Endpoints agregados: a tela inteira numa requisição só.
    Route::get('/dashboard', DashboardController::class);
    Route::get('/relatorios', RelatorioController::class);
});
