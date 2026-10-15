# Imagem de produção da API.
#
# A base já traz nginx e php-fpm montados e rodando como `www-data`, com a
# webroot em /var/www/html/public — exatamente o layout do Laravel. Montar isso
# à mão significaria carregar configuração de nginx, de php-fpm e de supervisor
# dentro deste repositório: três arquivos que não têm nada a ver com o produto
# e que só apareceriam quando quebrassem.
#
# A tag é fixa de propósito. `8.2-fpm-nginx-alpine` sozinha muda sob os pés
# quando a base é atualizada, e um redeploy daqui a seis meses subiria uma
# imagem diferente da que foi testada.
#
# PHP 8.2 é a mesma versão do ambiente de desenvolvimento. `pdo_mysql`,
# `opcache`, `pcntl` e `zip` já vêm na imagem — não há extensão a instalar.
FROM serversideup/php:8.2-fpm-nginx-alpine-v5.0.1

WORKDIR /var/www/html

# As dependências primeiro, o código depois.
#
# Esta ordem existe para o cache de camadas: mexer em app/ não invalida o
# `composer install`, e um redeploy que só mudou código reaproveita o vendor
# inteiro. Numa instância gratuita, com build compartilhado, essa diferença é
# de minutos.
COPY --chown=www-data:www-data composer.json composer.lock ./

RUN composer install \
      --no-dev \
      --no-interaction \
      --no-progress \
      --prefer-dist \
      --no-scripts \
      --no-autoloader

COPY --chown=www-data:www-data . .

# O autoload só agora, porque ele precisa ver as classes da aplicação.
# `--no-dev` derruba phpunit, mockery e faker: o vendor de produção fica só com
# o que a API executa de verdade.
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Sem opcache, cada requisição recompila o PHP do zero. A instância gratuita do
# Render tem 0,1 de CPU — é o lugar onde isso mais pesa.
ENV PHP_OPCACHE_ENABLE=1

# NÃO há `config:cache` nem `route:cache` aqui, e isso é deliberado.
#
# O cache de configuração grava os valores de ambiente DO MOMENTO DO BUILD. As
# variáveis reais — banco, APP_KEY, origem do CORS — só existem quando o
# container sobe no Render. Cachear aqui congelaria valores vazios e a API
# subiria sem conseguir falar com o banco, com um erro que não aponta para a
# causa.

# A base escuta em 8080 (não-privilegiada, para rodar sem root). O Render
# detecta a porta sozinho, mas declarar evita depender da detecção.
EXPOSE 8080
