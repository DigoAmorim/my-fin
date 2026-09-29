# My Fin

Estrutura inicial de uma aplicação financeira com React, TypeScript, Node.js e PostgreSQL.

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm 10+
- Docker com Docker Compose

## Começar

1. Copie `.env.example` para `.env`.
2. Instale as dependências na raiz: `npm install`.
3. Inicie o PostgreSQL: `npm run db:up`.
4. Inicie frontend e API: `npm run dev`.

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health
- Prontidão da API e banco: http://localhost:3000/api/health/ready

Use `npm run db:down` para parar o banco. Os dados locais ficam em um volume Docker chamado `postgres_data`.

## Organização

- `frontend`: aplicação React + TypeScript, criada com Vite.
- `backend`: API HTTP Node.js + TypeScript.
- `docker-compose.yml`: serviço PostgreSQL para desenvolvimento local.

O endpoint de prontidão valida a conexão com o banco. Ainda não há autenticação, regras financeiras, migrações ou configuração de produção; não use os dados de exemplo fora do desenvolvimento local.