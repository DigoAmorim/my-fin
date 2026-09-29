// Contratos da entidade e dos campos aceitos ao criar ou alterar um cartao.
export interface CreditCard {
  code: string;
  name: string;
  dueDay: number;
}

export interface CreditCardFields {
  name: string;
  dueDay: number;
}

export interface CreateCreditCardInput extends CreditCardFields {
  code: string;
}