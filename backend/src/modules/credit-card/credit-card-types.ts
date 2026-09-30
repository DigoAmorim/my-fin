// Contratos da entidade e dos campos aceitos ao criar ou alterar um cartao.
export interface CreditCard {
  id: number;
  name: string;
  dueDay: number;
}

export interface CreditCardFields {
  name: string;
  dueDay: number;
}

export type CreateCreditCardInput = CreditCardFields;