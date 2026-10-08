export type Payment = {
  id: number;
  name: string;
  amount: string;
  date: string | null;
  accountId: number;
  bankName: string;
  accountNumber: string;
};

export type PaymentFields = Pick<Payment, 'name' | 'amount' | 'date' | 'accountId'>;
