import { Pencil, Plus, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { BankLogo } from '../components/open-finance/bank-logo';
import { ContentSection } from '../components/layout/content-section';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SortableTableHead } from '../components/ui/sortable-table-head';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { listAccounts } from '../lib/account-api';
import { sortRows, useTableSortState } from '../lib/table-sorting';
import { useCurrencyFormatter, usePrivacyMode } from '../lib/privacy-mode';
import { resolveIntlLocale } from '../lib/locale';
import { createYield, deleteYield, listYields, updateYield } from '../lib/yield-api';
import { useAsyncResource } from '../lib/use-async-resource';
import type { Account } from '../types/account';
import type { AccountYield } from '../types/yield';

type YieldsPageProps = {
  onNavigate: (page: AppPage) => void;
};

type YieldForm = {
  accountId: string;
  isAutomatic: boolean;
  amount: string;
};

type YieldSortColumn =
  | 'bank'
  | 'account'
  | 'previousBalance'
  | 'currentBalance'
  | 'amount'
  | 'percentage'
  | 'mode';

const EMPTY_FORM: YieldForm = { accountId: '', isAutomatic: false, amount: '0' };

export function YieldsPage({ onNavigate }: YieldsPageProps) {
  const { t, i18n } = useTranslation();
  const { privateMode } = usePrivacyMode();
  const loadYields = useCallback(async (signal: AbortSignal) => {
    const [nextAccounts, yields] = await Promise.all([
      listAccounts(signal),
      listYields(signal),
    ]);
    return {
      accounts: nextAccounts.filter((account) => (
        account.accountType === 'checking'
        || account.accountType === 'savings'
        || account.accountType === 'fixed_income'
      )),
      yields,
    };
  }, []);
  const {
    data: yieldData,
    setData: setYieldData,
    isLoading,
    error: loadError,
    reload,
  } = useAsyncResource<{ accounts: Account[]; yields: AccountYield[] }>(
    loadYields,
    { accounts: [], yields: [] },
    t('common.error'),
  );
  const { accounts, yields } = yieldData;
  const availableAccounts = accounts.filter((account) => (
    !yields.some((accountYield) => accountYield.accountId === account.id)
  ));
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<YieldForm>(EMPTY_FORM);
  const [editingYield, setEditingYield] = useState<AccountYield | null>(null);
  const [deletingYield, setDeletingYield] = useState<AccountYield | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const { sortBy, sortDirection, toggleSort } = useTableSortState<YieldSortColumn>('bank');

  const locale = resolveIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const currencyFormatter = useCurrencyFormatter(locale);
  const percentageFormatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'always',
    maximumFractionDigits: 2,
  }), [locale]);
  const sortedYields = useMemo(() => sortRows(
    yields,
    (accountYield) => {
      switch (sortBy) {
        case 'bank':
          return accountYield.bankName;
        case 'account':
          return t(`rendaFixa.subtypes.${accountYield.accountNumber}`, {
            defaultValue: accountYield.accountNumber,
          });
        case 'previousBalance':
          return Number(accountYield.previousBalance);
        case 'currentBalance':
          return Number(accountYield.currentBalance);
        case 'amount':
          return Number(accountYield.amount);
        case 'percentage': {
          const previousBalance = Number(accountYield.previousBalance);
          return previousBalance === 0 ? null : Number(accountYield.amount) / previousBalance;
        }
        case 'mode':
          return t(accountYield.isAutomatic ? 'yields.automatic' : 'yields.manual');
      }
    },
    sortDirection,
    locale,
  ), [yields, sortBy, sortDirection, locale, t]);

  function closeForm() {
    setFormOpen(false);
    setEditingYield(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function openCreateForm() {
    setEditingYield(null);
    setForm({
      ...EMPTY_FORM,
      accountId: availableAccounts[0] ? String(availableAccounts[0].id) : '',
    });
    setFormError('');
    setFormOpen(true);
  }

  function openEditForm(accountYield: AccountYield) {
    setEditingYield(accountYield);
    setForm({
      accountId: String(accountYield.accountId),
      isAutomatic: accountYield.isAutomatic,
      amount: accountYield.amount,
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accountId = Number(form.accountId);
    if (!editingYield && (
      !Number.isSafeInteger(accountId)
      || !availableAccounts.some((account) => account.id === accountId)
    )) {
      setFormError(t('yields.selectAccount'));
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');
      if (editingYield) {
        const saved = await updateYield(editingYield.id, {
          isAutomatic: form.isAutomatic,
          amount: form.amount,
        });
        setYieldData((current) => ({
          ...current,
          yields: current.yields.map((item) => item.id === saved.id ? saved : item),
        }));
        toast.success(t('yields.updated'));
      } else {
        const created = await createYield({
          accountId,
          isAutomatic: form.isAutomatic,
        });
        setYieldData((current) => ({ ...current, yields: [created, ...current.yields] }));
        toast.success(t('yields.created'));
      }
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingYield) return;
    try {
      setIsDeleting(true);
      await deleteYield(deletingYield.id);
      setYieldData((current) => ({
        ...current,
        yields: current.yields.filter((item) => item.id !== deletingYield.id),
      }));
      setDeletingYield(null);
      toast.success(t('yields.deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  function formatPercentage(accountYield: AccountYield): string {
    const previousBalance = Number(accountYield.previousBalance);
    if (previousBalance === 0) return t('yields.notAvailable');
    return percentageFormatter.format(Number(accountYield.amount) / previousBalance);
  }

  function percentageClass(accountYield: AccountYield): string {
    const previousBalance = Number(accountYield.previousBalance);
    if (previousBalance === 0 || Number(accountYield.amount) === 0) return 'text-muted-foreground';
    return Number(accountYield.amount) / previousBalance > 0
      ? 'text-emerald-600'
      : 'text-destructive';
  }

  return (
    <AppLayout currentPage="yields" onNavigate={onNavigate}>
      <PageContainer>
        <PageHeader
          section={t('nav.yields')}
          title={t('yields.title')}
          action={(
            <Button size="small" onClick={openCreateForm} disabled={availableAccounts.length === 0}>
              <Plus size={15} />
              {t('yields.add')}
            </Button>
          )}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('yields.listTitle')}</h2>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">
              {t('yields.description')}
              {accounts.length > 0 && availableAccounts.length === 0 ? ` ${t('yields.noAvailableAccounts')}` : ''}
            </p>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="m-0 text-sm text-destructive" role="alert">{loadError}</p>
              <Button variant="outline" size="small" onClick={reload}>{t('yields.retry')}</Button>
            </div>
          ) : isLoading ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">
              {t('common.loading')}
            </p>
          ) : yields.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              {accounts.length ? (
                <TrendingUp size={28} className="text-muted-foreground" />
              ) : (
                <Wallet size={28} className="text-muted-foreground" />
              )}
              <p className="m-0 text-sm text-muted-foreground">
                {accounts.length ? t('yields.empty') : t('yields.noAccounts')}
              </p>
              {accounts.length ? (
                <Button size="small" onClick={openCreateForm}>
                  <Plus size={15} />
                  {t('yields.add')}
                </Button>
              ) : (
                <Button size="small" variant="outline" onClick={() => onNavigate('accounts')}>
                  {t('yields.openAccounts')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <SortableTableHead direction={sortBy === 'bank' ? sortDirection : null} onSort={() => toggleSort('bank')}>
                      {t('yields.bank')}
                    </SortableTableHead>
                    <SortableTableHead direction={sortBy === 'account' ? sortDirection : null} onSort={() => toggleSort('account')}>
                      {t('yields.account')}
                    </SortableTableHead>
                    <SortableTableHead className="text-right" align="right" direction={sortBy === 'previousBalance' ? sortDirection : null} onSort={() => toggleSort('previousBalance')}>
                      {t('yields.previousBalance')}
                    </SortableTableHead>
                    <SortableTableHead className="text-right" align="right" direction={sortBy === 'currentBalance' ? sortDirection : null} onSort={() => toggleSort('currentBalance')}>
                      {t('yields.currentBalance')}
                    </SortableTableHead>
                    <SortableTableHead className="text-right" align="right" direction={sortBy === 'amount' ? sortDirection : null} onSort={() => toggleSort('amount')}>
                      {t('yields.amount')}
                    </SortableTableHead>
                    <SortableTableHead className="text-right" align="right" direction={sortBy === 'percentage' ? sortDirection : null} onSort={() => toggleSort('percentage')}>
                      {t('yields.percentage')}
                    </SortableTableHead>
                    <SortableTableHead direction={sortBy === 'mode' ? sortDirection : null} onSort={() => toggleSort('mode')}>
                      {t('yields.mode')}
                    </SortableTableHead>
                    <th className="w-[100px] px-4 py-3 text-right font-medium sm:px-5">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedYields.map((accountYield) => (
                    <tr key={accountYield.id} className="text-foreground transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 sm:px-5">
                        <span className="flex items-center gap-2">
                          <BankLogo bankName={accountYield.bankName} />
                          <span>{accountYield.bankName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <span className="block">
                          {t(`rendaFixa.subtypes.${accountYield.accountNumber}`, {
                            defaultValue: accountYield.accountNumber,
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(`accounts.types.${accountYield.accountType === 'fixed_income' ? 'fixedIncome' : accountYield.accountType}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                        {currencyFormatter.format(Number(accountYield.previousBalance))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                        {currencyFormatter.format(Number(accountYield.currentBalance))}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums sm:px-5 ${
                        Number(accountYield.amount) > 0
                          ? 'text-emerald-600'
                          : Number(accountYield.amount) < 0 ? 'text-destructive' : 'text-foreground'
                      }`}>
                        {currencyFormatter.format(Number(accountYield.amount))}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium tabular-nums sm:px-5 ${percentageClass(accountYield)}`}>
                        {formatPercentage(accountYield)}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          accountYield.isAutomatic
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {t(accountYield.isAutomatic ? 'yields.automatic' : 'yields.manual')}
                        </span>
                      </td>
                      <td className="w-[100px] px-4 py-3 text-right sm:px-5">
                        <div className="flex w-full justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('common.edit')}
                            title={t('common.edit')}
                            onClick={() => openEditForm(accountYield)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                            onClick={() => setDeletingYield(accountYield)}
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
          )}
        </ContentSection>
      </PageContainer>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open && !isSaving) closeForm(); }}>
        <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[480px]">
          <DialogHeader className="px-[1.4rem] pb-[0.8rem] pr-12 pt-5">
            <DialogTitle>{t(editingYield ? 'yields.edit' : 'yields.add')}</DialogTitle>
            <DialogDescription>{t('yields.formDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 px-[1.4rem] pb-[1.4rem] pt-3">
            {!editingYield ? (
              <div className="flex flex-col gap-[0.45rem]">
                <Label htmlFor="yield-account">{t('yields.account')}</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(accountId) => setForm((current) => ({ ...current, accountId }))}
                  disabled={isSaving}
                >
                  <SelectTrigger id="yield-account" className="w-full">
                    <SelectValue placeholder={t('yields.selectAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)}>
                        {account.bankName} · {account.accountNumber} · {t(`accounts.types.${account.accountType === 'fixed_income' ? 'fixedIncome' : account.accountType}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/20 px-3 py-2">
                <span className="text-sm font-medium">{editingYield.bankName}</span>
                <span className="text-xs text-muted-foreground">{editingYield.accountNumber}</span>
              </div>
            )}

            <label htmlFor="yield-automatic" className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-3">
              <input
                id="yield-automatic"
                type="checkbox"
                className="mt-0.5 size-4 accent-primary"
                checked={form.isAutomatic}
                onChange={(event) => setForm((current) => ({ ...current, isAutomatic: event.target.checked }))}
                disabled={isSaving}
              />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">{t('yields.automatic')}</span>
                <span className="text-xs text-muted-foreground">{t('yields.automaticDescription')}</span>
              </span>
            </label>

            {editingYield && !form.isAutomatic ? (
              <div className="flex flex-col gap-[0.45rem]">
                <Label htmlFor="yield-amount">{t('yields.amount')}</Label>
                <Input
                  id="yield-amount"
                  type={privateMode ? 'password' : 'number'}
                  step={privateMode ? undefined : '0.01'}
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  disabled={isSaving}
                  required
                />
              </div>
            ) : null}

            {formError ? <p className="m-0 text-[0.8rem] text-destructive" role="alert">{formError}</p> : null}
            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSaving || (!editingYield && accounts.length === 0)}>
                {isSaving ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingYield !== null}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeletingYield(null); }}
      >
        <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[420px]">
          <DialogHeader className="px-[1.4rem] pb-3 pr-12 pt-5">
            <DialogTitle>{t('yields.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deletingYield
                ? t('yields.deleteConfirm', { bank: deletingYield.bankName, account: deletingYield.accountNumber })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-[1.4rem] pb-[1.4rem]">
            <Button variant="outline" onClick={() => setDeletingYield(null)} disabled={isDeleting}>
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
