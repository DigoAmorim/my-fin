import { Link2, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account } from '../../types/account';
import { sortRows, type SortDirection } from '../../lib/table-sorting';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { SortableTableHead } from '../ui/sortable-table-head';
import { BankLogo } from './bank-logo';

type AccountTableProps = {
  accounts: Account[];
  isLoading: boolean;
  locale: string;
  formatCurrency: (amount: number) => string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
};

function formatUpdatedAt(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AccountTable({
  accounts,
  isLoading,
  locale,
  formatCurrency,
  onEdit,
  onDelete,
}: AccountTableProps) {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'integration' | 'updatedAt'>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const sortedAccounts = useMemo(() => sortRows(
    accounts,
    (account) => {
      if (sortBy === 'balance') return Number(account.currentBalance);
      if (sortBy === 'integration') return account.pluggyItemId ? 1 : 0;
      if (sortBy === 'updatedAt') {
        const updatedAt = new Date(account.balanceUpdatedAt).getTime();
        return Number.isNaN(updatedAt) ? null : updatedAt;
      }
      return account.name;
    },
    sortDirection,
    locale,
  ), [accounts, sortBy, sortDirection, locale]);

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  }

  if (isLoading) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">{t('common.loading')}</p>;
  }
  if (accounts.length === 0) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('accounts.empty')}</p>;
  }

  return (
    <>
      <div className="divide-y divide-border md:hidden">
        {sortedAccounts.map((account) => {
          const hasPluggyId = Boolean(account.pluggyItemId);
          const balance = Number(account.currentBalance);
          const integrationStatusClass = hasPluggyId
            ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
            : 'border-border bg-muted text-muted-foreground';

          return (
            <article key={account.id} className="flex items-center gap-3 px-4 py-4">
              <BankLogo bankName={account.bankName} />
              <div className="min-w-0 flex-1">
                <h3 className="m-0 truncate text-sm font-semibold text-foreground">{account.name}</h3>
                <p className="mb-0 mt-0.5 truncate text-xs text-muted-foreground">{account.bankName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ${integrationStatusClass}`}>
                    <Link2 size={13} />
                    {t(hasPluggyId ? 'accounts.integrationActive' : 'accounts.integrationInactive')}
                  </span>
                  <span>{t('accounts.lastBalanceUpdate', { date: formatUpdatedAt(account.balanceUpdatedAt, locale) })}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={`text-sm font-semibold tabular-nums ${balance < 0 ? 'text-rose-500' : 'text-foreground'}`}>
                  {formatCurrency(balance)}
                </span>
                <div className="flex">
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`${t('common.edit')} ${account.name}`} onClick={() => onEdit(account)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:bg-destructive/5 hover:text-destructive" aria-label={`${t('common.delete')} ${account.name}`} onClick={() => onDelete(account)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16" />
              <SortableTableHead
                direction={sortBy === 'name' ? sortDirection : null}
                onSort={() => toggleSort('name')}
                buttonClassName="relative -left-16"
              >
                {t('accounts.table.name')}
              </SortableTableHead>
              <SortableTableHead className="w-40 text-right" align="right" direction={sortBy === 'balance' ? sortDirection : null} onSort={() => toggleSort('balance')}>
                {t('accounts.table.currentBalance')}
              </SortableTableHead>
              <SortableTableHead className="w-52" direction={sortBy === 'integration' ? sortDirection : null} onSort={() => toggleSort('integration')}>
                {t('accounts.table.openFinance')}
              </SortableTableHead>
              <SortableTableHead className="w-48" direction={sortBy === 'updatedAt' ? sortDirection : null} onSort={() => toggleSort('updatedAt')}>
                {t('accounts.table.lastUpdate')}
              </SortableTableHead>
              <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccounts.map((account) => {
              const hasPluggyId = Boolean(account.pluggyItemId);
              const balance = Number(account.currentBalance);
              const integrationStatusClass = hasPluggyId
                ? 'border-emerald-100 bg-emerald-50 text-emerald-600'
                : 'border-border bg-muted text-muted-foreground';

              return (
                <TableRow key={account.id}>
                  <TableCell><BankLogo bankName={account.bankName} /></TableCell>
                  <TableCell>
                    <span className="block font-medium text-foreground">{account.name}</span>
                    <span className="block text-xs text-muted-foreground">{account.bankName}</span>
                  </TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${balance < 0 ? 'text-rose-500' : 'text-foreground'}`}>
                    {formatCurrency(balance)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${integrationStatusClass}`}>
                      <Link2 size={13} />
                      {t(hasPluggyId ? 'accounts.integrationActive' : 'accounts.integrationInactive')}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatUpdatedAt(account.balanceUpdatedAt, locale)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`${t('common.edit')} ${account.name}`} onClick={() => onEdit(account)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-destructive/5 hover:text-destructive" aria-label={`${t('common.delete')} ${account.name}`} onClick={() => onDelete(account)}>
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
