import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AccountForm, type AccountFormValues } from '../components/accounts/account-form';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { ContentSection } from '../components/layout/content-section';
import { BankLogo } from '../components/open-finance/bank-logo';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { SortableTableHead } from '../components/ui/sortable-table-head';
import { sortRows, useTableSortState } from '../lib/table-sorting';
import { resolveIntlLocale } from '../lib/locale';
import { minorUnitsToNumber, sumMinorUnits } from '../lib/money';
import { useCurrencyFormatter } from '../lib/privacy-mode';
import { useAsyncResource } from '../lib/use-async-resource';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  createManualAccount,
  deleteAccount,
  listAccounts,
  updateManualAccount,
} from '../lib/account-api';
import type { Account, ManualAccountInput } from '../types/account';

type AccountsPageProps = {
  onNavigate: (page: AppPage) => void;
};

const EMPTY_ACCOUNT: AccountFormValues = {
  bankName: '',
  accountNumber: '',
  accountType: 'checking',
  balance: '',
};

type AccountSortColumn = 'bankName' | 'accountNumber' | 'accountType' | 'balance' | 'updatedAt';

export function AccountsPage({ onNavigate }: AccountsPageProps) {
  const { t, i18n } = useTranslation();
  const loadAccounts = useCallback(async (signal: AbortSignal) => (
    (await listAccounts(signal)).filter((item) => item.accountType !== 'fixed_income')
  ), []);
  const {
    data: accounts,
    setData: setAccounts,
    isLoading,
    error: loadError,
    reload: retryLoad,
  } = useAsyncResource<Account[]>(loadAccounts, [], t('common.error'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [values, setValues] = useState<AccountFormValues>(EMPTY_ACCOUNT);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { sortBy, sortDirection, toggleSort } = useTableSortState<AccountSortColumn>('bankName');

  function closeForm() {
    setDialogOpen(false);
    setEditingAccount(null);
    setValues(EMPTY_ACCOUNT);
    setFormError('');
  }

  function openCreateForm() {
    setEditingAccount(null);
    setValues(EMPTY_ACCOUNT);
    setFormError('');
    setDialogOpen(true);
  }

  function openEditForm(account: Account) {
    setEditingAccount(account);
    setValues({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: ManualAccountInput = {
      ...values,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      setFormError('');
      const savedAccount = editingAccount
        ? await updateManualAccount(editingAccount.id, input)
        : await createManualAccount(input);
      setAccounts((current) => {
        const next = editingAccount
          ? current.map((account) => account.id === savedAccount.id ? savedAccount : account)
          : [...current, savedAccount];
        return next.sort((left, right) => (
          left.bankName.localeCompare(right.bankName)
          || left.accountNumber.localeCompare(right.accountNumber)
        ));
      });
      toast.success(t(editingAccount ? 'accounts.updated' : 'accounts.created'));
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingAccount) return;
    try {
      setIsDeleting(true);
      await deleteAccount(deletingAccount.id);
      setAccounts((current) => current.filter((account) => account.id !== deletingAccount.id));
      setDeletingAccount(null);
      toast.success(t('accounts.deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  const locale = resolveIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const currencyFormatter = useCurrencyFormatter(locale);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  const totalBalance = useMemo(
    () => minorUnitsToNumber(sumMinorUnits(accounts.map((account) => account.balance))),
    [accounts],
  );
  const sortedAccounts = useMemo(() => sortRows(
    accounts,
    (account) => {
      switch (sortBy) {
        case 'bankName':
          return account.bankName;
        case 'accountNumber':
          return account.accountNumber;
        case 'accountType':
          return t(`accounts.types.${account.accountType}`);
        case 'balance':
          return Number(account.balance);
        case 'updatedAt':
          return account.updatedAt;
      }
    },
    sortDirection,
    locale,
  ), [accounts, sortBy, sortDirection, locale, t]);

  return (
    <AppLayout currentPage="accounts" onNavigate={onNavigate}>
      <PageContainer>
        <PageHeader
          section={t('accounts.title')}
          title={t('accounts.title')}
          action={(
            <Button size="small" onClick={openCreateForm}>
              <Plus size={15} />
              {t('accounts.add')}
            </Button>
          )}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">
              {t('accounts.listTitle')}
            </h2>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">
              {t('accounts.description')}
            </p>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="m-0 text-sm text-destructive" role="alert">{loadError}</p>
              <Button variant="outline" size="small" onClick={retryLoad}>
                {t('accounts.retry')}
              </Button>
            </div>
          ) : isLoading ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">{t('common.loading')}</p>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <Wallet size={28} className="text-muted-foreground" />
              <p className="m-0 text-sm text-muted-foreground">
                {t('accounts.empty')}
              </p>
              <Button size="small" onClick={openCreateForm}>
                <Plus size={15} />
                {t('accounts.add')}
              </Button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <span className="text-xs font-medium text-muted-foreground">{t('accounts.total')}</span>
                <span className={`text-sm font-bold tabular-nums ${totalBalance > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {currencyFormatter.format(totalBalance)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <SortableTableHead direction={sortBy === 'bankName' ? sortDirection : null} onSort={() => toggleSort('bankName')}>
                        {t('accounts.bankName')}
                      </SortableTableHead>
                      <SortableTableHead direction={sortBy === 'accountNumber' ? sortDirection : null} onSort={() => toggleSort('accountNumber')}>
                        {t('accounts.accountNumber')}
                      </SortableTableHead>
                      <SortableTableHead direction={sortBy === 'accountType' ? sortDirection : null} onSort={() => toggleSort('accountType')}>
                        {t('accounts.accountType')}
                      </SortableTableHead>
                      <SortableTableHead
                        className="text-right"
                        align="right"
                        direction={sortBy === 'balance' ? sortDirection : null}
                        onSort={() => toggleSort('balance')}
                      >
                        {t('accounts.balance')}
                      </SortableTableHead>
                      <SortableTableHead direction={sortBy === 'updatedAt' ? sortDirection : null} onSort={() => toggleSort('updatedAt')}>
                        {t('accounts.updatedAt')}
                      </SortableTableHead>
                      <th className="w-[100px] px-4 py-3 text-right font-medium sm:px-5">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedAccounts.map((account) => (
                      <tr key={account.id} className="text-foreground transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 sm:px-5">
                          <BankLogo bankName={account.bankName} />
                          <span className="sr-only">{account.bankName}</span>
                        </td>
                        <td className="px-4 py-3 sm:px-5">{account.accountNumber}</td>
                        <td className="px-4 py-3 sm:px-5">{t(`accounts.types.${account.accountType}`)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600 sm:px-5">
                          {currencyFormatter.format(Number(account.balance))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap sm:px-5">
                          {dateFormatter.format(new Date(account.updatedAt))} {t('common.at')}{' '}
                          {timeFormatter.format(new Date(account.updatedAt))}
                        </td>
                        <td className="w-[100px] px-4 py-3 text-right sm:px-5">
                          <div className="flex w-full justify-end gap-1">
                            {account.source === 'manual' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('common.edit')}
                                title={t('common.edit')}
                                onClick={() => openEditForm(account)}
                              >
                                <Pencil size={16} />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('common.delete')}
                              title={t('common.delete')}
                              onClick={() => setDeletingAccount(account)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </ContentSection>
      </PageContainer>

      <AccountForm
        isOpen={dialogOpen}
        isEditing={editingAccount !== null}
        isSaving={isSaving}
        values={values}
        validationError={formError}
        onValuesChange={setValues}
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />

      <Dialog open={deletingAccount !== null} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingAccount(null); }}>
        <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[420px]">
          <DialogHeader className="px-[1.4rem] pb-3 pr-12 pt-5">
            <DialogTitle>{t('accounts.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deletingAccount ? t('accounts.deleteConfirm', { name: deletingAccount.bankName }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-[1.4rem] pb-[1.4rem]">
            <Button variant="outline" onClick={() => setDeletingAccount(null)} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
