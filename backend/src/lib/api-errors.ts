import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';

const ptBRMessages = {
  internalServerError: 'Erro interno do servidor.',
  invalidJsonBody: 'O corpo da requisição contém JSON inválido.',
  requestBodyTooLarge: 'O corpo da requisição excede o tamanho permitido.',
  originNotAllowed: 'A origem da requisição não é permitida.',
  requestBodyObject: 'O corpo da requisição deve ser um objeto JSON.',
  idPositiveInteger: 'O id deve ser um número inteiro positivo.',
  accountNotFound: 'Conta não encontrada.',
  accountIdGenerated: 'O id da conta é gerado pelo sistema e não pode ser informado.',
  accountIdImmutable: 'O id da conta não pode ser alterado.',
  accountNameRequired: 'O nome da conta não pode ficar vazio.',
  accountNameMaxLength: 'O nome da conta deve ter no máximo 100 caracteres.',
  accountBankNameRequired: 'O nome do banco não pode ficar vazio.',
  accountBankNameMaxLength: 'O nome do banco deve ter no máximo 100 caracteres.',
  accountPluggyItemIdInvalid: 'O item ID do Pluggy deve ser um texto válido.',
  accountPluggyItemIdMaxLength: 'O item ID do Pluggy deve ter no máximo 100 caracteres.',
  accountBalanceInvalid: 'O saldo deve ser um número decimal válido.',
  accountBalanceMaxDecimals: 'O saldo deve ter no máximo duas casas decimais.',
  accountBalanceMaxValue: 'O saldo informado é muito alto.',
  pluggyCredentialsMissing: 'Configure as credenciais do Pluggy no ambiente do servidor.',
  pluggyAuthenticationFailed: 'Não foi possível autenticar no Pluggy.',
  creditCardNotFound: 'Cartão de crédito não encontrado.',
  creditCardIdGenerated: 'O id do cartão é gerado pelo sistema e não pode ser informado.',
  creditCardIdImmutable: 'O id do cartão não pode ser alterado.',
  creditCardNameRequired: 'O nome do cartão não pode ficar vazio.',
  creditCardNameMaxLength: 'O nome do cartão deve ter no máximo 20 caracteres.',
  creditCardDueDayRange: 'O dia de vencimento deve ser um número inteiro entre 1 e 31.',
  creditCardReferenced: 'O cartão está associado a outros registros e não pode ser excluído.',
  purchaseLimitNotFound: 'Limite não encontrado.',
  purchaseLimitIdGenerated: 'O id do limite é gerado pelo sistema e não pode ser informado.',
  purchaseLimitIdImmutable: 'O id do limite não pode ser alterado.',
  purchaseLimitTypeInvalid: 'Selecione um tipo de compra válido.',
  purchaseLimitTypeExists: 'Já existe um limite para esse tipo de compra.',
  purchaseLimitAmountPositive: 'O valor do limite deve ser maior que zero.',
  purchaseLimitAmountInvalid: 'O valor do limite deve ser um número decimal válido.',
  purchaseLimitAmountMaxDecimals: 'O valor do limite deve ter no máximo duas casas decimais.',
  purchaseLimitAmountMaxValue: 'O valor do limite é muito alto.',
  transactionNotFound: 'Transação não encontrada.',
  transactionIdGenerated: 'O id da transação é gerado pelo sistema e não pode ser informado.',
  transactionIdImmutable: 'O id da transação não pode ser alterado.',
  transactionCreditCardRequired: 'Selecione um cartão de crédito válido.',
  transactionCreditCardNotFound: 'O cartão de crédito selecionado não foi encontrado.',
  transactionInstallmentsPositiveInteger: 'O total de parcelas deve ser um número inteiro maior que zero.',
  transactionInstallmentAmountPositive: 'O valor da parcela deve ser maior que zero.',
  transactionInstallmentAmountInvalid: 'O valor da parcela deve ser um número decimal válido.',
  transactionInstallmentAmountMaxDecimals: 'O valor da parcela deve ter no máximo duas casas decimais.',
  transactionDebtorInvalid: 'O devedor deve ser um texto válido.',
  transactionDebtorMaxLength: 'O devedor deve ter no máximo 20 caracteres.',
  transactionDebtorRequiredForCredit: 'O devedor é obrigatório para transações do tipo crédito.',
  transactionTypeInvalid: 'O tipo da transação informado é inválido.',
  transactionDescriptionInvalid: 'A descrição deve ser um texto válido.',
  transactionDescriptionMaxLength: 'A descrição deve ter no máximo 50 caracteres.',
  transactionDateISO: 'A data deve ser válida e estar no formato AAAA-MM-DD.',
  transactionPurchaseTypeInvalid: 'O tipo de compra informado é inválido.',
  transactionSingleInstallmentRequired: 'Este tipo de compra deve ter exatamente uma parcela.',
  transactionPaymentMonthInvalid: 'Selecione um mês válido para o pagamento.',
  transactionPaymentSelectionRequired: 'Selecione ao menos uma transação para pagar.',
  transactionPaymentSelectionInvalid: 'A seleção de transações contém ids inválidos ou repetidos.',
  transactionPaymentCardMismatch: 'Todas as transações selecionadas devem pertencer ao cartão escolhido.',
  transactionAlreadyPaidForMonth: 'Uma ou mais transações já foram pagas neste mês.',
} as const;

export type BackendLocale = 'pt-BR' | 'en';
export type ApiMessageKey = keyof typeof ptBRMessages;

const enMessages: Record<ApiMessageKey, string> = {
  internalServerError: 'Internal server error.',
  invalidJsonBody: 'Request body contains invalid JSON.',
  requestBodyTooLarge: 'Request body exceeds the allowed size.',
  originNotAllowed: 'Request origin is not allowed.',
  requestBodyObject: 'Request body must be a JSON object.',
  idPositiveInteger: 'id must be a positive integer.',
  accountNotFound: 'Account not found.',
  accountIdGenerated: 'Account id is generated and cannot be set.',
  accountIdImmutable: 'Account id cannot be changed.',
  accountNameRequired: 'Account name must not be empty.',
  accountNameMaxLength: 'Account name must have at most 100 characters.',
  accountBankNameRequired: 'Bank name must not be empty.',
  accountBankNameMaxLength: 'Bank name must have at most 100 characters.',
  accountPluggyItemIdInvalid: 'Pluggy item ID must be valid text.',
  accountPluggyItemIdMaxLength: 'Pluggy item ID must have at most 100 characters.',
  accountBalanceInvalid: 'Balance must be a valid decimal number.',
  accountBalanceMaxDecimals: 'Balance must have at most two decimal places.',
  accountBalanceMaxValue: 'Balance is too high.',
  pluggyCredentialsMissing: 'Configure Pluggy credentials in the server environment.',
  pluggyAuthenticationFailed: 'Could not authenticate with Pluggy.',
  creditCardNotFound: 'Credit card not found.',
  creditCardIdGenerated: 'Credit card id is generated and cannot be set.',
  creditCardIdImmutable: 'Credit card id cannot be changed.',
  creditCardNameRequired: 'Credit card name must not be empty.',
  creditCardNameMaxLength: 'Credit card name must have at most 20 characters.',
  creditCardDueDayRange: 'Due day must be an integer between 1 and 31.',
  creditCardReferenced: 'Credit card is referenced by other records and cannot be deleted.',
  purchaseLimitNotFound: 'Purchase limit not found.',
  purchaseLimitIdGenerated: 'Purchase limit id is generated and cannot be set.',
  purchaseLimitIdImmutable: 'Purchase limit id cannot be changed.',
  purchaseLimitTypeInvalid: 'Select a valid purchase type.',
  purchaseLimitTypeExists: 'A limit already exists for this purchase type.',
  purchaseLimitAmountPositive: 'Limit amount must be greater than zero.',
  purchaseLimitAmountInvalid: 'Limit amount must be a valid decimal number.',
  purchaseLimitAmountMaxDecimals: 'Limit amount must have at most two decimal places.',
  purchaseLimitAmountMaxValue: 'Limit amount is too high.',
  transactionNotFound: 'Transaction not found.',
  transactionIdGenerated: 'Transaction id is generated and cannot be set.',
  transactionIdImmutable: 'Transaction id cannot be changed.',
  transactionCreditCardRequired: 'A valid credit card must be selected.',
  transactionCreditCardNotFound: 'The selected credit card was not found.',
  transactionInstallmentsPositiveInteger: 'Total installments must be a positive integer.',
  transactionInstallmentAmountPositive: 'Installment amount must be greater than zero.',
  transactionInstallmentAmountInvalid: 'Installment amount must be a valid decimal number.',
  transactionInstallmentAmountMaxDecimals: 'Installment amount must have at most two decimal places.',
  transactionDebtorInvalid: 'Debtor must be valid text.',
  transactionDebtorMaxLength: 'Debtor must have at most 20 characters.',
  transactionDebtorRequiredForCredit: 'Debtor is required for credit transactions.',
  transactionTypeInvalid: 'Transaction type is invalid.',
  transactionDescriptionInvalid: 'Description must be valid text.',
  transactionDescriptionMaxLength: 'Description must have at most 50 characters.',
  transactionDateISO: 'Date must be valid and use the YYYY-MM-DD format.',
  transactionPurchaseTypeInvalid: 'Purchase type is invalid.',
  transactionSingleInstallmentRequired: 'This purchase type must have exactly one installment.',
  transactionPaymentMonthInvalid: 'Select a valid payment month.',
  transactionPaymentSelectionRequired: 'Select at least one transaction to pay.',
  transactionPaymentSelectionInvalid: 'The transaction selection contains invalid or duplicate ids.',
  transactionPaymentCardMismatch: 'All selected transactions must belong to the chosen card.',
  transactionAlreadyPaidForMonth: 'One or more transactions have already been paid this month.',
};

const translations: Record<BackendLocale, Record<ApiMessageKey, string>> = {
  'pt-BR': ptBRMessages,
  en: enMessages,
};

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly messageKey: ApiMessageKey,
  ) {
    super(messageKey);
    this.name = 'ApiError';
  }
}

export function translate(locale: BackendLocale, key: ApiMessageKey): string {
  return translations[locale][key];
}

function localeForRequest(request: Request): BackendLocale {
  return request.acceptsLanguages('pt-BR', 'pt', 'en') === 'en' ? 'en' : 'pt-BR';
}

function errorType(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'type' in error && typeof error.type === 'string') {
    return error.type;
  }

  return undefined;
}

function sendError(error: unknown, request: Request, response: Response): void {
  const locale = localeForRequest(request);
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ error: translate(locale, error.messageKey) });
    return;
  }

  const type = errorType(error);
  if (type === 'entity.parse.failed') {
    response.status(400).json({ error: translate(locale, 'invalidJsonBody') });
    return;
  }
  if (type === 'entity.too.large') {
    response.status(413).json({ error: translate(locale, 'requestBodyTooLarge') });
    return;
  }

  console.error('API request failed:', error);
  response.status(500).json({ error: translate(locale, 'internalServerError') });
}

type AsyncController = (request: Request, response: Response) => Promise<void>;

// Negocia o idioma uma vez na camada HTTP e mantem services independentes de headers.
export function withErrorHandling(handler: AsyncController): RequestHandler {
  return async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      sendError(error, request, response);
    }
  };
}

// Trata erros que acontecem antes dos controllers, como JSON malformado e falhas de CORS.
export const apiErrorMiddleware: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  sendError(error, request, response);
};