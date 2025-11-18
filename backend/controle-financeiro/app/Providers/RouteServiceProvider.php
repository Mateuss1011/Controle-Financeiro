<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            // Define as rotas da API com o prefixo 'api' e o middleware 'api'
            Route::middleware('api')
                ->prefix('api') // Esta linha é crucial para o prefixo /api
                ->group(base_path('routes/api.php'));

            // Define as rotas da web com o middleware 'web'
            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        // Este método pode estar vazio ou conter lógica de limitação de taxa.
        // Se você não o tinha antes, pode deixá-lo vazio.
    }
}
