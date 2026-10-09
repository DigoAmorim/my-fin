import { HandCoins, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
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
import { DatePickerInput } from '../components/ui/date-picker-input';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { createPayment, deletePayment, listPayments, updatePayment } from '../lib/payment-api';
import { listAccounts } from '../lib/account-api';
import { sortRows, useTableSortState } from '../lib/table-sorting';
import { resolveIntlLocale } from '../lib/locale';
import { useCurrencyFormatter, usePrivacyMode } from '../lib/privacy-mode';
import { useAsyncResource } from '../lib/use-async-resource';
import { SortableTableHead } from '../components/ui/sortable-table-head';
import type { Account } from '../types/account';
import type { Payment, PaymentInput } from '../types/payment';

type PaymentsPageProps = {
  onNavigate: (page: AppPage) => void;
};

type PaymentFormValues = {
  name: string;
  amount: string;
  date: string;
  accountId: string;
};

const EMPTY_FORM: PaymentFormValues = {
  name: '',
  amount: '',
  date: '',
  accountId: '',
};

export function PaymentsPage({ onNavigate }: PaymentsPageProps) {
  const { t, i18n } = useTranslation();
  const { privateMode } = usePrivacyMode();
  const loadPayments = useCallback(async (signal: AbortSignal) => {
    const [nextAccounts, payments] = await Promise.all([
      listAccounts(signal),
      listPayments(signal),
    ]);
    return {
      accounts: nextAccounts.filter((account) => (
        account.accountType === 'checking' || account.accountType === 'savings'
      )),
      payments,
    };
  }, []);
  const {
    data: paymentData,
    isLoading,
    error: loadError,
    reload,
  } = useAsyncResource<{ accounts: Account[]; payments: Payment[] }>(
    loadPayments,
    { accounts: [], payments: [] },
    t('common.error'),
  );
  const { accounts, payments } = paymentData;
  const { sortBy, sortDirection, toggleSort } = useTableSortState<'name' | 'amount' | 'date' | 'account'>('date');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<PaymentFormValues>(EMPTY_FORM);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const locale = resolveIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const currencyFormatter = useCurrencyFormatter(locale);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);
  const sortedPayments = useMemo(() => sortRows(
    payments,
    (payment) => {
      switch (sortBy) {
        case 'name':
          return payment.name;
        case 'amount':
          return Number(payment.amount);
        case 'date':
          return payment.date;
        case 'account':
          return `${payment.bankName} ${payment.accountNumber}`;
      }
    },
    sortDirection,
    locale,
  ), [payments, sortBy, sortDirection, locale]);

  function closeForm() {
    setIsFormOpen(false);
    setEditingPayment(null);
    setForm(EMPTY_FORM);
    setValidationError('');
  }

  function openCreateForm() {
    setEditingPayment(null);
    setForm({ ...EMPTY_FORM, accountId: accounts[0] ? String(accounts[0].id) : '' });
    setValidationError('');
    setIsFormOpen(true);
  }

  function openEditForm(payment: Payment) {
    setEditingPayment(payment);
    setForm({
      name: payment.name,
      amount: payment.amount,
      date: payment.date ?? '',
      accountId: String(payment.accountId),
    });
    setValidationError('');
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accountId = Number(form.accountId);
    if (!Number.isSafeInteger(accountId) || accountId < 1) {
      setValidationError(t('payments.selectAccount'));
      return;
    }
    const input: PaymentInput = {
      name: form.name.trim(),
      amount: form.amount.trim(),
      date: form.date || null,
      accountId,
    };
    try {
      setIsSaving(true);
      setValidationError('');
      if (editingPayment) {
        await updatePayment(editingPayment.id, input);
        toast.success(t('payments.updated'));
      } else {
        await createPayment(input);
        toast.success(t('payments.created'));
      }
      closeForm();
      reload();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingPayment) return;
    try {
      setIsDeleting(true);
      await deletePayment(deletingPayment.id);
      setDeletingPayment(null);
      reload();
      toast.success(t('payments.deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppLayout currentPage="payments" onNavigate={onNavigate}>
      <PageContainer>
        <PageHeader
          section={t('nav.groupFeatures')}
          title={t('payments.title')}
          action={(
            <Button size="small" onClick={openCreateForm} disabled={accounts.length === 0}>
              <Plus size={15} />
              {t('payments.add')}
            </Button>
          )}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('payments.listTitle')}</h2>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">{t('payments.description')}</p>
          </div>

          {loadError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm">
              <p className="m-0 text-destructive" role="alert">{loadError}</p>
              <Button size="small" variant="outline" onClick={reload}>{t('payments.retry')}</Button>
            </div>
          ) : isLoading ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">
              {t('common.loading')}
            </p>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <Wallet size={28} className="text-muted-foreground" />
              <p className="m-0 text-sm text-muted-foreground">{t('payments.noAccounts')}</p>
              <Button size="small" variant="outline" onClick={() => onNavigate('accounts')}>
                {t('payments.openAccounts')}
              </Button>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <HandCoins size={28} className="text-muted-foreground" />
              <p className="m-0 text-sm text-muted-foreground">{t('payments.empty')}</p>
              <Button size="small" onClick={openCreateForm}>
                <Plus size={15} />
                {t('payments.add')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <SortableTableHead direction={sortBy === 'name' ? sortDirection : null} onSort={() => toggleSort('name')}>
                      {t('payments.name')}
                    </SortableTableHead>
                    <SortableTableHead
                      className="text-right"
                      align="right"
                      direction={sortBy === 'amount' ? sortDirection : null}
                      onSort={() => toggleSort('amount')}
                    >
                      {t('payments.amount')}
                    </SortableTableHead>
                    <SortableTableHead direction={sortBy === 'date' ? sortDirection : null} onSort={() => toggleSort('date')}>
                      {t('payments.date')}
                    </SortableTableHead>
                    <SortableTableHead direction={sortBy === 'account' ? sortDirection : null} onSort={() => toggleSort('account')}>
                      {t('payments.account')}
                    </SortableTableHead>
                    <th className="w-[100px] px-4 py-3 text-right font-medium sm:px-5">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedPayments.map((payment) => (
                    <tr key={payment.id} className="text-foreground transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium sm:px-5">{payment.name}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums sm:px-5">
                        {currencyFormatter.format(Number(payment.amount))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        {payment.date
                          ? dateFormatter.format(new Date(`${payment.date}T12:00:00`))
                          : t('payments.noDate')}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <span className="flex items-center gap-2">
                          <BankLogo bankName={payment.bankName} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{payment.bankName}</span>
                            <span className="block text-xs text-muted-foreground">{payment.accountNumber}</span>
                          </span>
                        </span>
                      </td>
                      <td className="w-[100px] px-4 py-3 text-right sm:px-5">
                        <div className="flex w-full justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('common.edit')}
                            title={t('common.edit')}
                            onClick={() => openEditForm(payment)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                            onClick={() => setDeletingPayment(payment)}
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open && !isSaving) closeForm(); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-xl p-0 shadow-xl sm:max-w-[520px]">
          <DialogHeader className="px-6 pb-3 pr-12 pt-6">
            <DialogTitle>{t(editingPayment ? 'payments.edit' : 'payments.add')}</DialogTitle>
            <DialogDescription>{t('payments.formDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 px-6 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="payment-name">{t('payments.name')}</Label>
              <Input
                id="payment-name"
                value={form.name}
                maxLength={100}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                disabled={isSaving}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount">{t('payments.amount')}</Label>
                <Input
                  id="payment-amount"
                  type={privateMode ? 'password' : 'text'}
                  inputMode="decimal"
                  value={form.amount}
                  placeholder="0.00"
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-date">{t('payments.date')}</Label>
                <DatePickerInput
                  id="payment-date"
                  value={form.date}
                  onChange={(date) => setForm({ ...form, date })}
                  disabled={isSaving}
                  className="w-full justify-start"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-account">{t('payments.account')}</Label>
              <Select
                value={form.accountId}
                onValueChange={(accountId) => setForm({ ...form, accountId })}
                disabled={isSaving}
                required
              >
                <SelectTrigger id="payment-account" className="w-full">
                  <SelectValue placeholder={t('payments.selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.bankName} — {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {validationError ? <p className="m-0 text-sm text-destructive" role="alert">{validationError}</p> : null}
            <DialogFooter className="mt-1">
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingPayment !== null}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeletingPayment(null); }}
      >
        <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[420px]">
          <DialogHeader className="px-[1.4rem] pb-3 pr-12 pt-5">
            <DialogTitle>{t('payments.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deletingPayment ? t('payments.deleteConfirm', { name: deletingPayment.name }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-[1.4rem] pb-[1.4rem]">
            <Button variant="outline" onClick={() => setDeletingPayment(null)} disabled={isDeleting}>
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
