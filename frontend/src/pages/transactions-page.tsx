import { CreditCard as CreditCardIcon, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { TransactionForm } from '../components/transactions/transaction-form';
import { TransactionTable } from '../components/transactions/transaction-table';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { ContentSection } from '../components/layout/content-section';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { MonthStepper } from '../components/ui/month-stepper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { createTransaction, deleteTransaction, listTransactions, payTransactions, updateTransaction } from '../lib/transaction-api';
import { listCreditCards } from '../lib/credit-card-api';
import { createCurrencyFormatter } from '../lib/utils';
import type { CreditCard } from '../types/credit-card';
import type { PurchaseType, Transaction, TransactionFormValues, TransactionInput, TransactionType } from '../types/transaction';

type TransactionsPageProps = {
  onNavigate: (page: AppPage) => void;
};

function localToday(): string {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function emptyForm(creditCardId = ''): TransactionFormValues {
  return {
    creditCardId,
    totalInstallments: '1',
    installmentAmount: '',
    debtor: '',
    transactionType: 'purchase',
    description: '',
    date: localToday(),
    purchaseType: 'first_fortnight',
  };
}

function sortTransactions(items: Transaction[]): Transaction[] {
  return [...items].sort((left, right) =>
    right.date.localeCompare(left.date) || right.id - left.id,
  );
}

function toFormValues(transaction: Transaction): TransactionFormValues {
  return {
    creditCardId: String(transaction.creditCardId),
    totalInstallments: String(transaction.totalInstallments),
    installmentAmount: transaction.installmentAmount,
    debtor: transaction.debtor ?? '',
    transactionType: transaction.transactionType,
    description: transaction.description ?? '',
    date: transaction.date,
    purchaseType: transaction.purchaseType,
  };
}

export function TransactionsPage({ onNavigate }: TransactionsPageProps) {
  const { t, i18n } = useTranslation();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [cardFilter, setCardFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState('');
  const [debtorFilter, setDebtorFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentCardId, setPaymentCardId] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isPaying, setIsPaying] = useState(false);
  const [form, setForm] = useState<TransactionFormValues>(() => emptyForm());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Cartoes alimentam os seletores; transacoes populam a tabela na mesma carga inicial.
  useEffect(() => {
    const controller = new AbortController();

    // Carrega os cartões para os selects e as transações para a listagem juntos.
    void Promise.all([
      listCreditCards(controller.signal),
      listTransactions(controller.signal),
    ])
      .then(([nextCards, nextTransactions]) => {
        if (controller.signal.aborted) return;
        setCards(nextCards);
        setTransactions(sortTransactions(nextTransactions));
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : t('common.error'));
        setIsLoading(false);
        controller.abort();
      });

    return () => {
      controller.abort();
    };
  }, [reloadKey, t]);

  // Aplica filtros estruturados no cliente sem alterar a colecao carregada da API.
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      (!cardFilter || String(transaction.creditCardId) === cardFilter)
      && (!typeFilter || transaction.transactionType === typeFilter)
      && (!purchaseFilter || transaction.purchaseType === purchaseFilter)
      && (!debtorFilter || transaction.debtor === debtorFilter),
    );
  }, [transactions, cardFilter, typeFilter, purchaseFilter, debtorFilter]);

  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith('pt') ? 'pt-BR' : 'en-US';
  const amountFormatter = useMemo(
    () => createCurrencyFormatter(locale),
    [locale],
  );
  const summaryTotals = useMemo(() => {
    let credit = 0;
    let expense = 0;

    for (const transaction of filteredTransactions) {
      const amount = Number(transaction.installmentAmount);
      if (!Number.isFinite(amount)) continue;

      if (transaction.transactionType === 'credit') credit += amount;
      else expense += amount;
    }

    return { credit, expense, balance: expense - credit };
  }, [filteredTransactions]);
  const selectedBalance = useMemo(() => {
    let balance = 0;

    for (const transaction of transactions) {
      if (!selectedTransactionIds.has(transaction.id)) continue;
      const amount = Number(transaction.installmentAmount);
      if (!Number.isFinite(amount)) continue;

      balance += transaction.transactionType === 'credit' ? -amount : amount;
    }

    return balance;
  }, [transactions, selectedTransactionIds]);
  const summaryLabels = locale === 'pt-BR'
    ? { credit: 'Crédito', expense: 'Despesa', balance: 'Saldo', selectedBalance: 'Saldo selecionado' }
    : { credit: 'Credit', expense: 'Expense', balance: 'Balance', selectedBalance: 'Selected balance' };
  const creditColor = summaryTotals.credit > 0 ? 'text-emerald-600' : 'text-muted-foreground';
  const expenseColor = summaryTotals.expense > 0 ? 'text-rose-500' : 'text-muted-foreground';
  const balanceColor = summaryTotals.balance > 0
    ? 'text-rose-500'
    : summaryTotals.balance < 0
      ? 'text-emerald-600'
      : 'text-muted-foreground';
  const selectedBalanceColor = selectedBalance > 0
    ? 'text-rose-500'
    : selectedBalance < 0
      ? 'text-emerald-600'
      : 'text-muted-foreground';
  const debtorOptions = useMemo(
    () => Array.from(new Set(
      transactions
        .map((transaction) => transaction.debtor?.trim())
        .filter((debtor): debtor is string => Boolean(debtor)),
    )).sort((left, right) => left.localeCompare(right, locale)),
    [transactions, locale],
  );
  const hasFilters = !!cardFilter || !!typeFilter || !!purchaseFilter || !!debtorFilter;
  const selectedTransactions = transactions.filter((transaction) => selectedTransactionIds.has(transaction.id));
  const paymentCardMismatch = selectedTransactions.some(
    (transaction) => String(transaction.creditCardId) !== paymentCardId,
  );

  function resetForm() {
    setIsFormOpen(false);
    setEditingTransaction(null);
    setValidationError('');
  }

  function handleNew() {
    setEditingTransaction(null);
    setForm(emptyForm(cards[0] ? String(cards[0].id) : ''));
    setValidationError('');
    setIsFormOpen(true);
  }

  function handleEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setForm(toFormValues(transaction));
    setValidationError('');
    setIsFormOpen(true);
  }

  function validateForm(): string | null {
    // Repete as regras principais do service para dar retorno imediato no formulario.
    const totalInstallments = Number(form.totalInstallments);
    const amount = form.installmentAmount.trim().replace(',', '.');

    if (!cards.some((card) => String(card.id) === form.creditCardId)) {
      return t('transactions.validation.cardRequired');
    }
    if (!Number.isSafeInteger(totalInstallments) || totalInstallments < 1) {
      return t('transactions.validation.installmentsPositive');
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
      return t('transactions.validation.amountDecimals');
    }
    if (Number(amount) <= 0) {
      return t('transactions.validation.amountPositive');
    }
    if (form.debtor.trim().length > 20) {
      return t('transactions.validation.debtorMaxLength');
    }
    if (form.transactionType === 'credit' && !form.debtor.trim()) {
      return t('transactions.validation.debtorRequired');
    }
    if (form.description.trim().length > 50) {
      return t('transactions.validation.descriptionMaxLength');
    }

    const selectedDate = new Date(`${form.date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)
      || Number.isNaN(selectedDate.getTime())
      || selectedDate.toISOString().slice(0, 10) !== form.date) {
      return t('transactions.validation.dateRequired');
    }
    if (form.purchaseType !== 'installment_plan' && totalInstallments !== 1) {
      return t('transactions.validation.singleInstallmentRequired');
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }

    const isEditing = editingTransaction !== null;
    const payload: TransactionInput = {
      creditCardId: Number(form.creditCardId),
      totalInstallments: Number(form.totalInstallments),
      installmentAmount: form.installmentAmount.trim().replace(',', '.'),
      debtor: form.debtor.trim() || null,
      transactionType: form.transactionType as TransactionType,
      description: form.description.trim() || null,
      date: form.date,
      purchaseType: form.purchaseType as PurchaseType,
    };

    try {
      setIsSaving(true);
      setValidationError('');
      const saved = isEditing
        ? await updateTransaction(editingTransaction.id, payload)
        : await createTransaction(payload);

      setTransactions((current) => sortTransactions(
        isEditing
          ? current.map((transaction) => transaction.id === saved.id ? saved : transaction)
          : [...current, saved],
      ));
      resetForm();
      toast.success(t(isEditing ? 'transactions.updated' : 'transactions.created'));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingTransaction) return;

    try {
      setIsDeleting(true);
      await deleteTransaction(deletingTransaction.id);
      setTransactions((current) => current.filter((transaction) => transaction.id !== deletingTransaction.id));
      setDeletingTransaction(null);
      toast.success(t('transactions.deleted'));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  function openPaymentDialog() {
    const selectedCardIds = new Set(selectedTransactions.map((transaction) => transaction.creditCardId));
    setPaymentCardId(selectedCardIds.size === 1 ? String(selectedCardIds.values().next().value) : '');
    setIsPaymentOpen(true);
  }

  async function confirmPayment() {
    if (!paymentCardId || selectedTransactionIds.size === 0 || paymentCardMismatch) return;

    const month = `${paymentMonth.getFullYear()}-${String(paymentMonth.getMonth() + 1).padStart(2, '0')}`;
    try {
      setIsPaying(true);
      const result = await payTransactions({
        creditCardId: Number(paymentCardId),
        paymentMonth: month,
        transactionIds: Array.from(selectedTransactionIds),
      });
      const removedIds = new Set(result.removedTransactionIds);
      const updatedById = new Map(result.updatedTransactions.map((transaction) => [transaction.id, transaction]));
      setTransactions((current) => sortTransactions(
        current
          .filter((transaction) => !removedIds.has(transaction.id))
          .map((transaction) => updatedById.get(transaction.id) ?? transaction),
      ));
      setSelectedTransactionIds(new Set());
      setIsPaymentOpen(false);
      toast.success(t('transactions.paymentSuccess', { count: result.paidCount }));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <AppLayout
      currentPage="transactions"
      onNavigate={onNavigate}
    >
      <PageContainer>
        <PageHeader
          section={t('nav.transactions')}
          title={t('transactions.title')}
          action={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="small"
                variant="outline"
                onClick={openPaymentDialog}
                disabled={selectedTransactionIds.size === 0 || isPaying}
              >
                <CreditCardIcon size={15} />
                {t('transactions.payCard')}
              </Button>
              <Button size="small" onClick={handleNew} disabled={cards.length === 0 || isLoading}>
                <Plus size={15} />
                {t('transactions.new')}
              </Button>
            </div>
          )}
        />

        <ContentSection>
          <div className="flex flex-col gap-x-5 gap-y-1 border-b border-border bg-muted/30 px-4 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center justify-between sm:hidden">
              <span className="text-xs text-muted-foreground">
                {t('transactions.resultCount', { count: filteredTransactions.length })}
              </span>
              <span className="flex items-baseline gap-1.5 text-xs">
                <span className="text-muted-foreground">{summaryLabels.balance}</span>
                <span className={`text-sm font-bold tabular-nums ${balanceColor}`}>
                  {amountFormatter.format(summaryTotals.balance)}
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between sm:hidden">
              <span className="flex items-baseline gap-1.5 text-xs">
                <span className="text-muted-foreground">{summaryLabels.credit}</span>
                <span className={`text-sm font-semibold tabular-nums ${creditColor}`}>
                  {amountFormatter.format(summaryTotals.credit)}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5 text-xs">
                <span className="text-muted-foreground">{summaryLabels.expense}</span>
                <span className={`text-sm font-semibold tabular-nums ${expenseColor}`}>
                  {amountFormatter.format(summaryTotals.expense)}
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-end gap-1.5 text-xs sm:hidden">
              <span className="text-muted-foreground">{summaryLabels.selectedBalance}</span>
              <span className={`text-sm font-bold tabular-nums ${selectedBalanceColor}`}>
                {amountFormatter.format(selectedBalance)}
              </span>
            </div>
            <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">
              {t('transactions.resultCount', { count: filteredTransactions.length })}
            </span>
            <span className="hidden items-baseline gap-1.5 text-xs sm:flex">
              <span className="text-muted-foreground">{summaryLabels.credit}</span>
              <span className={`text-sm font-semibold tabular-nums ${creditColor}`}>
                {amountFormatter.format(summaryTotals.credit)}
              </span>
            </span>
            <span className="hidden items-baseline gap-1.5 text-xs sm:flex">
              <span className="text-muted-foreground">{summaryLabels.expense}</span>
              <span className={`text-sm font-semibold tabular-nums ${expenseColor}`}>
                {amountFormatter.format(summaryTotals.expense)}
              </span>
            </span>
            <span className="hidden items-baseline gap-1.5 text-xs sm:flex">
              <span className="text-muted-foreground">{summaryLabels.balance}</span>
              <span className={`text-sm font-bold tabular-nums ${balanceColor}`}>
                {amountFormatter.format(summaryTotals.balance)}
              </span>
            </span>
            <span className="hidden items-baseline gap-1.5 text-xs sm:flex">
              <span className="text-muted-foreground">{summaryLabels.selectedBalance}</span>
              <span className={`text-sm font-bold tabular-nums ${selectedBalanceColor}`}>
                {amountFormatter.format(selectedBalance)}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 max-md:items-start max-md:px-3.5">
            <div>
              <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('transactions.listTitle')}</h2>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 max-md:w-full">
              <Select value={cardFilter || 'all'} onValueChange={(value) => setCardFilter(value === 'all' ? '' : value)}>
                <SelectTrigger aria-label={t('transactions.filterCard')} className="min-w-[130px]">
                  <SelectValue placeholder={t('transactions.filterCard')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.filterCard')}</SelectItem>
                  {cards.map((card) => <SelectItem key={card.id} value={String(card.id)}>{card.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter || 'all'} onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value)}>
                <SelectTrigger aria-label={t('transactions.filterType')} className="min-w-[180px]">
                  <SelectValue placeholder={t('transactions.filterType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.filterType')}</SelectItem>
                  <SelectItem value="main_card">{t('transactions.types.mainCard')}</SelectItem>
                  <SelectItem value="purchase">{t('transactions.types.purchase')}</SelectItem>
                  <SelectItem value="credit">{t('transactions.types.credit')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={purchaseFilter || 'all'} onValueChange={(value) => setPurchaseFilter(value === 'all' ? '' : value)}>
                <SelectTrigger aria-label={t('transactions.filterPurchase')} className="min-w-[170px]">
                  <SelectValue placeholder={t('transactions.filterPurchase')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.filterPurchase')}</SelectItem>
                  <SelectItem value="first_fortnight">{t('transactions.purchaseTypes.firstFortnight')}</SelectItem>
                  <SelectItem value="second_fortnight">{t('transactions.purchaseTypes.secondFortnight')}</SelectItem>
                  <SelectItem value="recurring">{t('transactions.purchaseTypes.recurring')}</SelectItem>
                  <SelectItem value="installment_plan">{t('transactions.purchaseTypes.installmentPlan')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={debtorFilter || 'all'} onValueChange={(value) => setDebtorFilter(value === 'all' ? '' : value)}>
                <SelectTrigger aria-label={t('transactions.filterDebtor')} className="min-w-[150px] max-w-[240px]">
                  <SelectValue placeholder={t('transactions.filterDebtor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.filterDebtor')}</SelectItem>
                  {debtorOptions.map((debtor) => (
                    <SelectItem key={debtor} value={debtor}>{debtor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  title={t('transactions.clearFilters')}
                  aria-label={t('transactions.clearFilters')}
                  onClick={() => {
                    setCardFilter('');
                    setTypeFilter('');
                    setPurchaseFilter('');
                    setDebtorFilter('');
                  }}
                >
                  <X size={15} />
                </Button>
              )}
            </div>
          </div>

          {loadError ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-destructive">
              <p className="m-0" role="alert">{loadError}</p>
              <Button
                size="small"
                variant="outline"
                onClick={() => {
                  setIsLoading(true);
                  setLoadError('');
                  setReloadKey((key) => key + 1);
                }}
              >
                {t('transactions.retry')}
              </Button>
            </div>
          ) : !isLoading && cards.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <p className="m-0 text-sm font-medium text-foreground/80">{t('transactions.noCards')}</p>
              <Button size="small" variant="outline" onClick={() => onNavigate('creditCards')}>
                {t('transactions.openCards')}
              </Button>
            </div>
          ) : (
            <TransactionTable
              transactions={filteredTransactions}
              cards={cards}
              isLoading={isLoading}
              locale={locale}
              emptyMessage={hasFilters ? t('transactions.noMatches') : t('transactions.empty')}
              selectedIds={selectedTransactionIds}
              onSelectionChange={setSelectedTransactionIds}
              onEdit={handleEdit}
              onDelete={setDeletingTransaction}
            />
          )}
        </ContentSection>
      </PageContainer>

      <TransactionForm
        open={isFormOpen}
        cards={cards}
        form={form}
        isEditing={editingTransaction !== null}
        isSaving={isSaving}
        validationError={validationError}
        onChange={setForm}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />

      <Dialog open={isPaymentOpen} onOpenChange={(open) => { if (!isPaying) setIsPaymentOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('transactions.payCard')}</DialogTitle>
            <DialogDescription>
              {t('transactions.paymentDescription', { count: selectedTransactionIds.size })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="payment-card">{t('transactions.fields.card')}</label>
              <Select value={paymentCardId} onValueChange={setPaymentCardId}>
                <SelectTrigger id="payment-card" aria-label={t('transactions.fields.card')}>
                  <SelectValue placeholder={t('transactions.selectCard')} />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={String(card.id)}>{card.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t('transactions.paymentMonth')}</span>
              <MonthStepper
                value={`${paymentMonth.getFullYear()}-${String(paymentMonth.getMonth() + 1).padStart(2, '0')}`}
                onChange={(value) => {
                  const [year, month] = value.split('-').map(Number);
                  setPaymentMonth(new Date(year, month - 1, 1));
                }}
                locale={locale}
                previousMonthLabel={t('transactions.previousMonth')}
                nextMonthLabel={t('transactions.nextMonth')}
                previousYearLabel={t('transactions.previousYear')}
                nextYearLabel={t('transactions.nextYear')}
              />
            </div>
          </div>
          {paymentCardMismatch && (
            <p className="text-sm text-destructive" role="alert">{t('transactions.paymentCardMismatch')}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)} disabled={isPaying}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void confirmPayment()}
              disabled={!paymentCardId || selectedTransactionIds.size === 0 || paymentCardMismatch || isPaying}
            >
              <CreditCardIcon size={15} />
              {isPaying ? t('common.loading') : t('transactions.pay')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingTransaction !== null}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeletingTransaction(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transactions.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('transactions.deleteConfirm', {
                description: deletingTransaction?.description || t('transactions.noDescription'),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTransaction(null)} disabled={isDeleting}>
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