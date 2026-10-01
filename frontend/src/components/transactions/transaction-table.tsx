import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreditCard } from '../../types/credit-card';
import type { PurchaseType, Transaction, TransactionType } from '../../types/transaction';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const transactionTypeLabelKeys: Record<TransactionType, string> = {
  main_card: 'transactions.types.mainCard',
  purchase: 'transactions.types.purchase',
  credit: 'transactions.types.credit',
};

const purchaseTypeLabelKeys: Record<PurchaseType, string> = {
  first_fortnight: 'transactions.purchaseTypes.firstFortnight',
  second_fortnight: 'transactions.purchaseTypes.secondFortnight',
  installment_plan: 'transactions.purchaseTypes.installmentPlan',
};

type TransactionTableProps = {
  transactions: Transaction[];
  cards: CreditCard[];
  isLoading: boolean;
  locale: string;
  emptyMessage: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function TransactionTable({
  transactions,
  cards,
  isLoading,
  locale,
  emptyMessage,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  // Reaproveita os lookups e o formatador entre renderizacoes da mesma lista.
  const cardNames = useMemo(() => new Map(cards.map((card) => [card.id, card.name])), [cards]);
  const amountFormatter = useMemo(
    () => new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    [locale],
  );
  // O checkbox mestre afeta somente as linhas visiveis e preserva selecoes fora dos filtros.
  const visibleIds = transactions.map((transaction) => transaction.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  function toggleTransaction(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleTransactions() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  // Cada estado da tabela tem uma resposta dedicada para evitar linhas inconsistentes.
  if (isLoading) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (transactions.length === 0) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(element) => {
                if (element) element.indeterminate = someVisibleSelected;
              }}
              onChange={toggleVisibleTransactions}
              aria-label={t('transactions.selectAll')}
              title={t('transactions.selectAll')}
              className="size-4 cursor-pointer rounded border-border accent-primary"
            />
          </TableHead>
          <TableHead>{t('transactions.fields.card')}</TableHead>
          <TableHead>{t('transactions.fields.purchase')}</TableHead>
          <TableHead>{t('transactions.fields.type')}</TableHead>
          <TableHead>{t('transactions.fields.debtor')}</TableHead>
          <TableHead>{t('transactions.fields.date')}</TableHead>
          <TableHead className="text-right">{t('transactions.fields.installments')}</TableHead>
          <TableHead>{t('transactions.fields.description')}</TableHead>
          <TableHead className="text-right">{t('transactions.fields.amount')}</TableHead>
          <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => {
          // Cartao gera saida negativa; os demais tipos representam valor positivo.
          const isCredit = transaction.transactionType === 'credit';

          return (
          <TableRow key={transaction.id}>
            <TableCell className="w-10">
              <input
                type="checkbox"
                checked={selectedIds.has(transaction.id)}
                onChange={() => toggleTransaction(transaction.id)}
                aria-label={t('transactions.selectOne', {
                  description: transaction.description || t('transactions.noDescription'),
                })}
                title={t('transactions.selectOne', {
                  description: transaction.description || t('transactions.noDescription'),
                })}
                className="size-4 cursor-pointer rounded border-border accent-primary"
              />
            </TableCell>
            <TableCell>{cardNames.get(transaction.creditCardId) ?? t('transactions.unknownCard')}</TableCell>
            <TableCell>{t(purchaseTypeLabelKeys[transaction.purchaseType])}</TableCell>
            <TableCell>{t(transactionTypeLabelKeys[transaction.transactionType])}</TableCell>
            <TableCell>{transaction.debtor || '—'}</TableCell>
            <TableCell className="whitespace-nowrap tabular-nums">
              {new Date(`${transaction.date}T00:00:00`).toLocaleDateString(locale)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {transaction.currentInstallment}/{transaction.totalInstallments}
            </TableCell>
            <TableCell className="max-w-[220px] truncate font-medium" title={transaction.description ?? ''}>
              {transaction.description || t('transactions.noDescription')}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <span className={`font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-500'}`}>
                {isCredit ? '- ' : '+ '}{amountFormatter.format(Math.abs(Number(transaction.installmentAmount)))}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t('common.edit')} ${transaction.description ?? ''}`}
                title={t('common.edit')}
                onClick={() => onEdit(transaction)}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                aria-label={`${t('common.delete')} ${transaction.description ?? ''}`}
                title={t('common.delete')}
                onClick={() => onDelete(transaction)}
              >
                <Trash2 size={14} />
              </Button>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}