<?php

namespace App\Providers;

use App\Services\Analise\AnalisadorFinanceiroInterface;
use App\Services\Analise\AnalisadorPorRegras;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        /*
         * Ponto de extensão para IA: hoje o analisador é determinístico. Trocar
         * por um AnalisadorPorIA é uma linha aqui — nem o controller nem o
         * frontend conhecem a implementação.
         */
        $this->app->bind(AnalisadorFinanceiroInterface::class, AnalisadorPorRegras::class);
    }

    public function boot(): void
    {
        $this->configurarRateLimiters();
    }

    /**
     * O login não tinha limite algum: era possível tentar senhas indefinidamente.
     * O limite de autenticação é por IP + e-mail, para que o ataque a uma conta
     * não bloqueie as outras contas do mesmo IP compartilhado.
     */
    private function configurarRateLimiters(): void
    {
        RateLimiter::for('autenticacao', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip() . '|' . (string) $request->input('email')),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
