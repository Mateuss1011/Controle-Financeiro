💰 Sistema de Controle Financeiro
================================

O **Sistema de Controle Financeiro** é uma aplicação web desenvolvida para auxiliar usuários no gerenciamento de receitas e despesas, promovendo organização financeira por meio de categorias, datas e registros detalhados.

O projeto simula um cenário real de desenvolvimento, aplicando conceitos amplamente utilizados no mercado, com foco em arquitetura, organização de código e integração entre front-end e back-end.

---

📌 Status do Projeto

✅ **Projeto concluído**

O sistema foi totalmente implementado conforme o escopo proposto, com funcionalidades essenciais desenvolvidas, testadas e integradas.  
Atualmente, encontra-se estável e pronto para demonstração, uso acadêmico e apresentação em portfólio profissional.

---

## 🎯 Funcionalidades

- Cadastro de **receitas** e **despesas**
- Gerenciamento de **categorias financeiras**
- Organização de lançamentos por **data**
- Listagem clara e objetiva dos registros financeiros
- Edição e exclusão de lançamentos
- Validações de dados no front-end e no back-end
- Estrutura preparada para autenticação e controle de usuários

---

## 🛠️ Stack Tecnológico

### Back-end
- **PHP**
- **Laravel**
- **MySQL**
- **API REST**
- **Migrations e Seeders**
- **Controllers, Models e validações**

### Front-end
- **React**
- **React-Bootstrap**
- **Consumo de API REST**
- **Componentização**
- **Gerenciamento básico de estado**

### Ferramentas e Metodologia
- **Git / GitHub** – versionamento de código
- **Postman** – testes e validação de endpoints
- **Figma** – prototipação da interface
- **Scrum** – organização do desenvolvimento

---

## 🛠️ Design

<img width="1870" height="928" alt="image" src="https://github.com/user-attachments/assets/d91e7628-d8f3-4a68-8cae-713c7320aa96" />
<img width="1877" height="959" alt="image" src="https://github.com/user-attachments/assets/435ad44e-2450-4194-98d2-d7352318afa0" />



## 🧱 Arquitetura e Boas Práticas

- Separação clara entre **front-end** e **back-end**
- Organização seguindo o padrão do framework Laravel
- Código modular e reutilizável
- Estrutura preparada para escalabilidade e manutenção
- Comunicação via API REST seguindo padrões HTTP

---

## 🚀 Possíveis Evoluções

O projeto foi finalizado, porém permite diversas melhorias futuras, como:

- Autenticação completa com **JWT**
- Dashboard com **gráficos financeiros**
- Relatórios mensais e anuais
- Exportação de dados (Excel)
- Controle multiusuário
- Deploy em ambiente de produção

---

## 👨‍💻 Autor

**Mateus Silva Santos**  
Formado em Análise e Desenvolvimento de Sistemas  

Projeto desenvolvido com foco em aprendizado prático, aplicação de conceitos reais de mercado e consolidação de habilidades. 


🚀 Configuração e Inicialização do Projeto
=========================================

Este projeto foi desenvolvido para rodar em ambiente local, sem utilização de Docker.

---

## 1️⃣ Clonar o repositório

```bash
git clone https://github.com/Mateuss1011/Controle-Financeiro.git
cd controle-financeiro

2️⃣ Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

PHP (versão compatível com Laravel)
Composer
Node.js e npm
MySQL
Git

3️⃣ Configurar o Back-end (Laravel)

Criar o arquivo .env
cp .env.example .env

Configurar conexão com o banco de dados

No arquivo .env, ajuste as variáveis:

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=controle_financeiro
DB_USERNAME=root
DB_PASSWORD=


Crie o banco de dados no MySQL com o mesmo nome informado acima.

Instalar dependências do Laravel
composer install

Gerar chave da aplicação
php artisan key:generate

Executar migrations e seeders
php artisan migrate --seed

Limpar caches da aplicação

php artisan config:clear
php artisan cache:clear
php artisan route:clear

Subir o servidor back-end
php artisan serve


O back-end ficará disponível em:

👉 http://localhost:8000

4️⃣ Configurar o Front-end (React)

Acesse a pasta do front-end (caso esteja separada):

cd frontend

Instalar dependências
npm install

Iniciar o servidor front-end
npm start


O front-end ficará disponível em:

👉 http://localhost:3000

✅ Projeto pronto para uso

Com o back-end e o front-end em execução, o sistema de Controle Financeiro estará pronto para uso em ambiente local.

⚠️ Possíveis Problemas Comuns

Verifique se o MySQL está em execução

Confirme se as credenciais do banco estão corretas no .env

Caso altere o .env, execute:

php artisan config:clear
