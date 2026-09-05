<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->throttleApi('api');

        // A API é stateless (Bearer token). Nenhuma rota de API deve tentar
        // redirecionar um visitante para uma tela de login inexistente.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Garante resposta JSON (401/403/404/422) em toda a API, mesmo quando o
        // cliente não envia o header Accept: application/json.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        /*
         * Erro de API fala português e não descreve o servidor.
         *
         * O padrão do Laravel para um id inexistente é
         * "No query results for model [App\Models\Gasto] 999" — e isso sai
         * assim MESMO COM APP_DEBUG=false. Duas coisas erradas de uma vez: o
         * nome e o namespace da classe interna viram informação pública, e o
         * usuário recebe uma frase técnica em inglês. Um 404 é rotina (basta um
         * link velho), então não é um caso de canto.
         *
         * Rota inexistente e método errado devolviam `message` VAZIA, o que dá
         * ao cliente um erro sem nada para mostrar. A negativa de Policy vinha
         * como "This action is unauthorized.".
         *
         * O status não muda em nenhum caso — só o texto.
         */
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            // A causa distingue "id que não existe" de "endereço que não existe".
            $ehModelo = $e->getPrevious() instanceof ModelNotFoundException;

            return response()->json([
                'message' => $ehModelo
                    ? 'Registro não encontrado.'
                    : 'Endereço não encontrado.',
            ], 404);
        });

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            return $request->is('api/*')
                ? response()->json(['message' => 'Método não permitido para este endereço.'], 405)
                : null;
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            return $request->is('api/*')
                ? response()->json(['message' => 'Você não tem permissão para isso.'], 403)
                : null;
        });
    })->create();
