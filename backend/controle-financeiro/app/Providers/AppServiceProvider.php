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

        /**
         * Rotas autenticadas que conferem a senha atual: troca de e-mail e
         * troca de senha.
         *
         * A chave é o ID do usuário, e NÃO o e-mail enviado. Reaproveitar o
         * limitador 'autenticacao' aqui parece natural e é um furo: naquele
         * balde a chave inclui o e-mail do corpo, que nestas rotas é escolhido
         * por quem ataca — bastava variar o e-mail a cada tentativa para ganhar
         * um balde novo e adivinhar a senha à vontade. Foi exatamente o que o
         * smoke test da fase final mostrou, com seis tentativas seguidas sem
         * bloqueio.
         *
         * No login o e-mail na chave está certo, porque lá ele identifica a
         * conta alvo. Aqui a conta alvo é quem está autenticado.
         */
        RateLimiter::for('credencial', function (Request $request) {
            return [
                Limit::perMinute(5)->by('credencial|' . ($request->user()?->id ?: $request->ip())),
                Limit::perMinute(20)->by('credencial-ip|' . $request->ip()),
            ];
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
