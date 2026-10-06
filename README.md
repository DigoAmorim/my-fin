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
4. Aplique as migrações: `npm run db:migrate`.
5. Inicie frontend e API: `npm run dev`.

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health
- Prontidão da API e banco: http://localhost:3000/api/health/ready

Use `npm run db:down` para parar o banco. Os dados locais ficam em um volume Docker chamado `postgres_data`.

## Organização

- `frontend`: aplicação React + TypeScript, criada com Vite.
- `backend`: API HTTP Node.js + TypeScript.
- `backend/database`: runner TypeScript e migrações PostgreSQL em arquivos SQL numerados.
- `docker-compose.yml`: serviço PostgreSQL para desenvolvimento local.

O endpoint de prontidão valida a conexão com o banco. Ainda não há autenticação, regras financeiras ou configuração de produção; não use os dados de exemplo fora do desenvolvimento local.

## Contas e Open Finance

Para sincronizar contas pela Pluggy, configure `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no `.env`. O botão **Atualizar dados** na configuração do Open Finance autentica na Pluggy, consulta as contas correntes e poupanças habilitadas para cada banco e atualiza os saldos existentes sem duplicá-los. Renda fixa e variável ainda não são sincronizadas.

A tela **Contas** lista os saldos sincronizados e manuais, usando a data `updatedAt` retornada pela Pluggy para contas Open Finance. Contas manuais podem ser criadas, editadas e excluídas; contas sincronizadas só podem ser excluídas. O formulário manual registra a data e hora do navegador no momento em que é salvo. A migração `011_create_account.sql` cria a tabela usada por esse recurso.

## API de transações

As transações ficam disponíveis em `GET` e `POST /api/transactions`, além de `GET`, `PUT` e `DELETE /api/transactions/:id`.

O corpo de criação/atualização aceita `creditCardId`, `totalInstallments`, `installmentAmount`, `debtor`, `transactionType`, `description`, `date` e `purchaseType`. Use `main_card`, `purchase` ou `credit` para `transactionType`; `first_fortnight`, `second_fortnight`, `installment_plan` ou `recurring` para `purchaseType`. A data deve usar `YYYY-MM-DD`. O valor da parcela é preferencialmente enviado como string decimal, por exemplo `"12.30"`, e também é devolvido como string para preservar a precisão monetária. As respostas incluem `currentInstallment` e `totalInstallments`; novos registros começam em `1`.

O backend exige devedor para transações `credit`, exige exatamente uma parcela em `first_fortnight`, `second_fortnight` e `recurring`, e pelo menos uma parcela em `installment_plan`. As mesmas regras estruturais também são garantidas pela migration do PostgreSQL. Mensagens de erro usam `Accept-Language` (`pt-BR` ou `en`), com fallback para português.