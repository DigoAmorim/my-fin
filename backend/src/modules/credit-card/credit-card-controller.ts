import type { Request, RequestHandler, Response } from 'express';
import {
  createCreditCard as create,
  CreditCardServiceError,
  deleteCreditCard as remove,
  getCreditCard as get,
  listCreditCards as list,
  updateCreditCard as update,
} from './credit-card-service';

// A camada HTTP traduz chamadas em operacoes do service e prepara as respostas.
type AsyncController = (request: Request, response: Response) => Promise<void>;

// Converte erros conhecidos em status HTTP e evita expor detalhes internos.
function withErrorHandling(handler: AsyncController): RequestHandler {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      if (error instanceof CreditCardServiceError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
      }

      console.error('Credit card request failed:', error);
      response.status(500).json({ error: 'Internal server error.' });
    }
  };
}

export const listCreditCards = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const getCreditCard = withErrorHandling(async (request, response) => {
  response.json(await get(request.params.id));
});

export const createCreditCard = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updateCreditCard = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deleteCreditCard = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});