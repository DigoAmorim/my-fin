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

O endpoint de prontidão valida a conexão com o banco. A aplicação ainda não possui autenticação ou configuração de produção; não a exponha publicamente nem use dados financeiros reais em ambientes sem esses controles.

## Contas e Open Finance

Para sincronizar dados pela Pluggy, configure `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no `.env`. O botão **Atualizar dados** na configuração do Open Finance autentica uma vez e consulta, em paralelo, contas correntes/poupanças habilitadas e investimentos `FIXED_INCOME` dos bancos com renda fixa ou variável ativada. Contas são atualizadas por banco e número; investimentos são agrupados por banco e `subtype` antes de serem gravados em `my_fin.account`. Excluir um investimento remove fisicamente o grupo; uma sincronização futura o cria novamente se continuar presente na Pluggy.

A tela **Contas** lista os saldos sincronizados e manuais, usando a data retornada pela Pluggy para contas Open Finance. Contas manuais podem ser criadas, editadas e excluídas; contas sincronizadas só podem ser excluídas. A tela **Renda fixa** apresenta uma linha por banco e tipo de investimento, com o valor agregado e a data mais recente do grupo. Também é possível cadastrar aplicações de renda fixa manualmente; apenas essas podem ser editadas, enquanto posições Pluggy são somente leitura. O formulário manual registra a data e hora do navegador no momento em que é salvo.

## Arquitetura e manutenção

- `frontend/src/pages` coordena o estado e a composição das telas; componentes reutilizáveis ficam em `components`, chamadas HTTP em `lib` e contratos da API em `types`.
- `backend/src/modules/<domínio>` mantém rotas, controllers, serviços, repositórios e tipos próximos ao domínio. Controllers adaptam HTTP, serviços aplicam regras e repositórios concentram SQL.
- `backend/src/lib` contém infraestrutura compartilhada, como validação, erros, decimal e cliente Pluggy; regras específicas de um domínio permanecem no módulo correspondente.
- `backend/database/migrations` contém alterações de schema versionadas. Não altere manualmente tabelas de ambientes já migrados sem registrar a mudança em uma migration.
- O backend valida as regras de domínio antes de persistir e usa constraints no PostgreSQL para reforçar invariantes estruturais, como os limites de parcelas.
- Os valores monetários da API são tratados como decimais; mantenha valores como strings nos contratos para não perder precisão ao passar por números de ponto flutuante.
- `my_fin.account_snapshot` guarda uma posição por conta e mês, usando o primeiro dia do mês em `snapshot_month`. A evolução do patrimônio compara os 11 meses recentes com snapshots aos saldos atuais das contas; o índice por mês é mantido por migration para servir essa consulta conforme o histórico cresce.
- Operações de escrita que abrangem várias instruções usam `backend/database/transaction.ts` para assegurar commit/rollback e liberação do cliente PostgreSQL no mesmo padrão.
- `frontend/src/lib/locale.ts` centraliza a conversão do idioma da interface para os locales de formatação (`pt-BR` e `en-US`).
- Telas que compartilham o mesmo ciclo de leitura assíncrona usam `frontend/src/lib/use-async-resource.ts`, com cancelamento ao desmontar, estado de carregamento/erro e recarga explícita; fluxos com estado distinto continuam locais à tela.
- Cada conta pode ter um único registro em `my_fin.account_yield`; a migration 026 aborta sem alterar dados caso encontre duplicatas existentes. Rendimentos automáticos usam o saldo em `my_fin.account.balance` e o snapshot mais recente anterior ao mês corrente. A migration correspondente mantém o rendimento sincronizado quando o saldo da conta é atualizado.
- Verificações locais: `npm test --workspace @my-fin/backend` executa os testes do backend; `npm run build` compila backend e frontend; `npm run lint` executa os linters dos workspaces. O frontend ainda não possui uma suíte de testes automatizados configurada.

## API de transações

As transações ficam disponíveis em `GET` e `POST /api/transactions`, além de `GET`, `PUT` e `DELETE /api/transactions/:id`.

O corpo de criação/atualização aceita `creditCardId`, `totalInstallments`, `installmentAmount`, `debtor`, `transactionType`, `description`, `date` e `purchaseType`. Use `main_card`, `purchase` ou `credit` para `transactionType`; `first_fortnight`, `second_fortnight`, `installment_plan` ou `recurring` para `purchaseType`. A data deve usar `YYYY-MM-DD`. O valor da parcela é preferencialmente enviado como string decimal, por exemplo `"12.30"`, e também é devolvido como string para preservar a precisão monetária. As respostas incluem `currentInstallment` e `totalInstallments`; novos registros começam em `1`.

O backend exige devedor para transações `credit`, exige exatamente uma parcela em `first_fortnight`, `second_fortnight` e `recurring`, e pelo menos uma parcela em `installment_plan`. As mesmas regras estruturais também são garantidas pela migration do PostgreSQL. Mensagens de erro usam `Accept-Language` (`pt-BR` ou `en`), com fallback para português.