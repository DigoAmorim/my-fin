import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreditCard } from '../../types/credit-card';
import type { Transaction } from '../../types/transaction';
import { purchaseTypeLabelKeys, transactionTypeLabelKeys } from '../../lib/transaction-labels';
import { sortRows, type SortDirection } from '../../lib/table-sorting';
import { useCurrencyFormatter } from '../../lib/privacy-mode';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { SortableTableHead } from '../ui/sortable-table-head';

type TransactionTableProps = {
  transactions: Transaction[];
  cards: CreditCard[];
  isLoading: boolean;
  locale: string;
  emptyMessage: string;
  selectedIds: Set<number>;
  onSelectionChange: (selectedIds: Set<number>) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function TransactionTable({
  transactions,
  cards,
  isLoading,
  locale,
  emptyMessage,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const { t } = useTranslation();
  type SortColumn = 'card' | 'purchase' | 'type' | 'debtor' | 'date' | 'installments' | 'description' | 'amount';
  const [sortBy, setSortBy] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Reaproveita os lookups e o formatador entre renderizacoes da mesma lista.
  const cardNames = useMemo(() => new Map(cards.map((card) => [card.id, card.name])), [cards]);
  const amountFormatter = useCurrencyFormatter(locale);
  const sortedTransactions = useMemo(() => sortRows(
    transactions,
    (transaction) => {
      switch (sortBy) {
        case 'card':
          return cardNames.get(transaction.creditCardId) ?? t('transactions.unknownCard');
        case 'purchase':
          return t(purchaseTypeLabelKeys[transaction.purchaseType]);
        case 'type':
          return t(transactionTypeLabelKeys[transaction.transactionType]);
        case 'debtor':
          return transaction.debtor || null;
        case 'date':
          return transaction.date;
        case 'installments':
          return transaction.totalInstallments * 100 + transaction.currentInstallment;
        case 'description':
          return transaction.description || t('transactions.noDescription');
        case 'amount': {
          const amount = Math.abs(Number(transaction.installmentAmount));
          return transaction.transactionType === 'credit' ? -amount : amount;
        }
      }
    },
    sortDirection,
    locale,
  ), [transactions, cardNames, t, sortBy, sortDirection, locale]);

  function toggleSort(column: SortColumn) {
    if (sortBy === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  }
  // O checkbox mestre afeta somente as linhas visiveis e preserva selecoes fora dos filtros.
  const visibleIds = sortedTransactions.map((transaction) => transaction.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  function toggleTransaction(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  function toggleVisibleTransactions() {
    const next = new Set(selectedIds);
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    onSelectionChange(next);
  }

  // Cada estado da tabela tem uma resposta dedicada para evitar linhas inconsistentes.
  if (isLoading) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (transactions.length === 0) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="hidden md:block">
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
              <SortableTableHead direction={sortBy === 'card' ? sortDirection : null} onSort={() => toggleSort('card')}>
                {t('transactions.fields.card')}
              </SortableTableHead>
              <SortableTableHead direction={sortBy === 'purchase' ? sortDirection : null} onSort={() => toggleSort('purchase')}>
                {t('transactions.fields.purchase')}
              </SortableTableHead>
              <SortableTableHead direction={sortBy === 'type' ? sortDirection : null} onSort={() => toggleSort('type')}>
                {t('transactions.fields.type')}
              </SortableTableHead>
              <SortableTableHead direction={sortBy === 'debtor' ? sortDirection : null} onSort={() => toggleSort('debtor')}>
                {t('transactions.fields.debtor')}
              </SortableTableHead>
              <SortableTableHead direction={sortBy === 'date' ? sortDirection : null} onSort={() => toggleSort('date')}>
                {t('transactions.fields.date')}
              </SortableTableHead>
              <SortableTableHead className="text-right" align="right" direction={sortBy === 'installments' ? sortDirection : null} onSort={() => toggleSort('installments')}>
                {t('transactions.fields.installments')}
              </SortableTableHead>
              <SortableTableHead direction={sortBy === 'description' ? sortDirection : null} onSort={() => toggleSort('description')}>
                {t('transactions.fields.description')}
              </SortableTableHead>
              <SortableTableHead className="text-right" align="right" direction={sortBy === 'amount' ? sortDirection : null} onSort={() => toggleSort('amount')}>
                {t('transactions.fields.amount')}
              </SortableTableHead>
              <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction) => {
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
      </div>

      <div className="divide-y divide-border md:hidden">
        <div className="flex items-center gap-3 bg-muted/30 px-4 py-3">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            ref={(element) => {
              if (element) element.indeterminate = someVisibleSelected;
            }}
            onChange={toggleVisibleTransactions}
            aria-label={t('transactions.selectAll')}
            className="size-4 shrink-0 cursor-pointer rounded border-border accent-primary"
          />
          <span className="text-xs font-medium text-muted-foreground">{t('transactions.selectAll')}</span>
        </div>
        {sortedTransactions.map((transaction) => {
          const isCredit = transaction.transactionType === 'credit';
          const description = transaction.description || t('transactions.noDescription');

          return (
            <article key={transaction.id} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(transaction.id)}
                  onChange={() => toggleTransaction(transaction.id)}
                  aria-label={t('transactions.selectOne', { description })}
                  className="mt-1 size-4 shrink-0 cursor-pointer rounded border-border accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="m-0 min-w-0 break-words text-sm font-semibold text-foreground">
                      {description}
                    </p>
                    <span className={`shrink-0 whitespace-nowrap text-sm font-bold tabular-nums ${isCredit ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {isCredit ? '- ' : '+ '}{amountFormatter.format(Math.abs(Number(transaction.installmentAmount)))}
                    </span>
                  </div>
                  <p className="mb-0 mt-1 truncate text-xs text-muted-foreground">
                    {cardNames.get(transaction.creditCardId) ?? t('transactions.unknownCard')}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/70 pt-3">
                    <span className="min-w-0 text-xs text-muted-foreground">
                      {t('transactions.fields.date')}
                      <strong className="mt-0.5 block truncate font-medium text-foreground">
                        {new Date(`${transaction.date}T00:00:00`).toLocaleDateString(locale)}
                      </strong>
                    </span>
                    <span className="min-w-0 text-xs text-muted-foreground">
                      {t('transactions.fields.installments')}
                      <strong className="mt-0.5 block font-medium tabular-nums text-foreground">
                        {transaction.currentInstallment}/{transaction.totalInstallments}
                      </strong>
                    </span>
                    <span className="min-w-0 text-xs text-muted-foreground">
                      {t('transactions.fields.purchase')}
                      <strong className="mt-0.5 block truncate font-medium text-foreground">
                        {t(purchaseTypeLabelKeys[transaction.purchaseType])}
                      </strong>
                    </span>
                    <span className="min-w-0 text-xs text-muted-foreground">
                      {t('transactions.fields.type')}
                      <strong className="mt-0.5 block truncate font-medium text-foreground">
                        {t(transactionTypeLabelKeys[transaction.transactionType])}
                      </strong>
                    </span>
                    {transaction.debtor && (
                      <span className="col-span-2 min-w-0 text-xs text-muted-foreground">
                        {t('transactions.fields.debtor')}
                        <strong className="mt-0.5 block truncate font-medium text-foreground">{transaction.debtor}</strong>
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label={`${t('common.edit')} ${description}`}
                      onClick={() => onEdit(transaction)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                      aria-label={`${t('common.delete')} ${description}`}
                      onClick={() => onDelete(transaction)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}