import { ArrowLeft, ChevronRight, Printer, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MonthStepper } from '../components/month-stepper';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { ContentSection } from '../components/layout/content-section';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { getPaymentHistory } from '../lib/transaction-api';
import { listCreditCards } from '../lib/credit-card-api';
import { resolveDateLocales } from '../lib/date-locales';
import { purchaseTypeLabelKeys, transactionTypeLabelKeys } from '../lib/transaction-labels';
import type { CreditCard } from '../types/credit-card';
import type { PurchaseType, TransactionType } from '../types/transaction';
import type { PaidTransaction, PaymentHistory } from '../lib/transaction-api';

type InvoicesPageProps = {
  onNavigate: (page: AppPage) => void;
};

const EMPTY_TRANSACTIONS: PaidTransaction[] = [];

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function InvoicesPage({ onNavigate }: InvoicesPageProps) {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [history, setHistory] = useState<PaymentHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseType | ''>('');
  const [debtorFilter, setDebtorFilter] = useState('');
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [selectedPrintDebtors, setSelectedPrintDebtors] = useState<string[]>([]);
  const loadedHistoryRef = useRef<{ cardId: number; month: string } | null>(null);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { intlLocale } = resolveDateLocales(language);

  useEffect(() => {
    const controller = new AbortController();

    void listCreditCards(controller.signal)
      .then((nextCards) => {
        if (controller.signal.aborted) return;
        setCards(nextCards);
        setCardsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCardsError(error instanceof Error ? error.message : t('invoices.loadError'));
        setCardsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey, t]);

  useEffect(() => {
    if (!selectedCard) return;
    const requestedMonth = selectedMonth;
    const loadedMonth = requestedMonth ?? currentYearMonth();
    if (
      loadedHistoryRef.current?.cardId === selectedCard.id
      && loadedHistoryRef.current.month === loadedMonth
    ) return;

    const controller = new AbortController();

    void getPaymentHistory(selectedCard.id, requestedMonth ?? undefined, controller.signal)
      .then((nextHistory) => {
        if (controller.signal.aborted) return;
        const month = requestedMonth ?? nextHistory.paymentMonth ?? currentYearMonth();
        loadedHistoryRef.current = { cardId: selectedCard.id, month };
        setHistory(nextHistory);
        setSelectedMonth(month);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setHistoryError(error instanceof Error ? error.message : t('invoices.loadError'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });

    return () => controller.abort();
  }, [selectedCard, selectedMonth, historyReloadKey, t]);

  const transactions = history?.transactions ?? EMPTY_TRANSACTIONS;
  const debtors = useMemo(
    () => Array.from(new Set(transactions.map((transaction) => transaction.debtor?.trim()).filter((value): value is string => Boolean(value))))
      .sort((left, right) => left.localeCompare(right, intlLocale)),
    [transactions, intlLocale],
  );
  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(intlLocale);
    return transactions.filter((transaction) => {
      const matchesText = !normalizedSearch
        || transaction.description?.toLocaleLowerCase(intlLocale).includes(normalizedSearch)
        || transaction.debtor?.toLocaleLowerCase(intlLocale).includes(normalizedSearch);
      return matchesText
        && (!typeFilter || transaction.transactionType === typeFilter)
        && (!purchaseFilter || transaction.purchaseType === purchaseFilter)
        && (!debtorFilter || transaction.debtor === debtorFilter);
    });
  }, [transactions, search, typeFilter, purchaseFilter, debtorFilter, intlLocale]);
  const pdfDebtors = useMemo(
    () => Array.from(new Set(filteredTransactions.map((transaction) => transaction.debtor?.trim() ?? '')))
      .sort((left, right) => {
        if (!left) return 1;
        if (!right) return -1;
        return left.localeCompare(right, intlLocale);
      }),
    [filteredTransactions, intlLocale],
  );
  const allPdfDebtorsSelected = pdfDebtors.length > 0
    && pdfDebtors.every((debtor) => selectedPrintDebtors.includes(debtor));

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
  const summaryLabels = intlLocale === 'pt-BR'
    ? { credit: 'Crédito', expense: 'Despesa', balance: 'Saldo' }
    : { credit: 'Credit', expense: 'Expense', balance: 'Balance' };
  const creditColor = summaryTotals.credit > 0 ? 'text-emerald-600' : 'text-muted-foreground';
  const expenseColor = summaryTotals.expense > 0 ? 'text-rose-500' : 'text-muted-foreground';
  const balanceColor = summaryTotals.balance > 0
    ? 'text-rose-500'
    : summaryTotals.balance < 0
      ? 'text-emerald-600'
      : 'text-muted-foreground';
  const hasFilters = !!search || !!typeFilter || !!purchaseFilter || !!debtorFilter;

  const amountFormatter = useMemo(
    () => new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    [intlLocale],
  );

  function openCard(card: CreditCard) {
    loadedHistoryRef.current = null;
    setSelectedCard(card);
    setSelectedMonth(null);
    setHistory(null);
    setHistoryLoading(true);
    setHistoryError('');
    setSearch('');
    setTypeFilter('');
    setPurchaseFilter('');
    setDebtorFilter('');
  }

  function closeCard() {
    setSelectedCard(null);
    setSelectedMonth(null);
    setHistory(null);
    setHistoryError('');
  }

  function handleMonthChange(month: string) {
    setHistoryLoading(true);
    setHistoryError('');
    setSelectedMonth(month);
  }

  function openPrintDialog() {
    setSelectedPrintDebtors(pdfDebtors);
    setIsPrintDialogOpen(true);
  }

  async function handleDownloadPdf() {
    if (!selectedCard || !selectedMonth || selectedPrintDebtors.length === 0) return;
    const selectedDebtorSet = new Set(selectedPrintDebtors);
    const selectedTransactions = filteredTransactions.filter((transaction) =>
      selectedDebtorSet.has(transaction.debtor?.trim() ?? ''),
    );
    if (selectedTransactions.length === 0) return;

    try {
      const { downloadInvoicePdf } = await import('../lib/invoice-pdf');
      downloadInvoicePdf({
        cardName: selectedCard.name,
        month: selectedMonth,
        locale: intlLocale,
        transactions: selectedTransactions,
        labels: {
          title: t('invoices.pdf.title'),
          month: t('invoices.pdf.month'),
          generatedAt: t('invoices.pdf.generatedAt'),
          totalsByDebtor: t('invoices.pdf.totalsByDebtor'),
          debtor: t('invoices.pdf.debtor'),
          total: t('invoices.pdf.total'),
          noDebtor: t('invoices.pdf.noDebtor'),
          date: t('invoices.pdf.date'),
          description: t('invoices.pdf.description'),
          purchaseType: t('invoices.pdf.purchaseType'),
          type: t('invoices.pdf.type'),
          installments: t('invoices.pdf.installments'),
          amount: t('invoices.pdf.amount'),
          page: t('invoices.pdf.page'),
          transactionTypeLabels: Object.fromEntries(
            Object.entries(transactionTypeLabelKeys).map(([key, labelKey]) => [key, t(labelKey)]),
          ) as Record<TransactionType, string>,
          purchaseTypeLabels: Object.fromEntries(
            Object.entries(purchaseTypeLabelKeys).map(([key, labelKey]) => [key, t(labelKey)]),
          ) as Record<PurchaseType, string>,
        },
      });
      setIsPrintDialogOpen(false);
    } catch {
      toast.error(t('invoices.pdf.error'));
    }
  }

  const detail = selectedCard !== null;

  return (
    <AppLayout
      currentPage="invoices"
      onNavigate={onNavigate}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((current) => !current)}
    >
      <PageContainer>
        <PageHeader
          section={t('invoices.title')}
          title={detail ? selectedCard.name : t('invoices.title')}
        />

        {!detail ? (
          <ContentSection>
            <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
              <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('invoices.cardsTitle')}</h2>
            </div>
            {cardsError ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                <span>{cardsError}</span>
                <Button size="small" variant="outline" onClick={() => {
                  setCardsLoading(true);
                  setCardsError('');
                  setReloadKey((key) => key + 1);
                }}>
                  <RotateCcw size={14} />
                  {t('transactions.retry')}
                </Button>
              </div>
            ) : cardsLoading ? (
              <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : cards.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="m-0 text-sm text-muted-foreground">{t('invoices.emptyCards')}</p>
                <Button className="mt-4" size="small" variant="outline" onClick={() => onNavigate('creditCards')}>
                  {t('transactions.openCards')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoices.card')}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow
                      key={card.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="w-full cursor-pointer text-left font-medium text-foreground"
                          onClick={() => openCard(card)}
                          aria-label={`${t('invoices.openHistory')}: ${card.name}`}
                        >
                          {card.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="sr-only">{t('invoices.openHistory')}</span>
                        <button
                          type="button"
                          className="ml-auto inline-flex size-8 cursor-pointer items-center justify-center text-muted-foreground"
                          onClick={() => openCard(card)}
                          aria-label={`${t('invoices.openHistory')}: ${card.name}`}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ContentSection>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <MonthStepper
                value={selectedMonth ?? currentYearMonth()}
                onChange={handleMonthChange}
                locale={language}
                previousMonthLabel={t('transactions.previousMonth')}
                nextMonthLabel={t('transactions.nextMonth')}
                previousYearLabel={t('transactions.previousYear')}
                nextYearLabel={t('transactions.nextYear')}
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="small" onClick={closeCard}>
                  <ArrowLeft size={15} />
                  {t('invoices.backToCards')}
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={openPrintDialog}
                  disabled={historyLoading || filteredTransactions.length === 0}
                >
                  <Printer size={15} />
                  {t('invoices.print')}
                </Button>
              </div>
            </div>
            <ContentSection>
              {!historyLoading && !historyError && filteredTransactions.length > 0 && (
                <div className="flex flex-col gap-x-5 gap-y-1 border-b border-border bg-muted/30 px-4 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex items-center justify-between sm:hidden">
                    <span className="text-xs text-muted-foreground">
                      {t('invoices.resultCount', { count: filteredTransactions.length })}
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
                  <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">
                    {t('invoices.resultCount', { count: filteredTransactions.length })}
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
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 max-md:items-start max-md:px-3.5">
                <div>
                  <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('invoices.paidTransactions')}</h2>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 max-md:w-full">
                <div className="relative min-w-[190px] flex-1 sm:max-w-xs">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('invoices.search')}
                    aria-label={t('invoices.search')}
                    className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <Select value={typeFilter || 'all'} onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value as TransactionType)}>
                  <SelectTrigger aria-label={t('invoices.filterType')} className="min-w-[180px]">
                    <SelectValue placeholder={t('invoices.filterType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('invoices.filterType')}</SelectItem>
                    {(Object.keys(transactionTypeLabelKeys) as TransactionType[]).map((type) => (
                      <SelectItem key={type} value={type}>{t(transactionTypeLabelKeys[type])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={purchaseFilter || 'all'} onValueChange={(value) => setPurchaseFilter(value === 'all' ? '' : value as PurchaseType)}>
                  <SelectTrigger aria-label={t('invoices.filterPurchase')} className="min-w-[170px]">
                    <SelectValue placeholder={t('invoices.filterPurchase')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('invoices.filterPurchase')}</SelectItem>
                    {(Object.keys(purchaseTypeLabelKeys) as PurchaseType[]).map((type) => (
                      <SelectItem key={type} value={type}>{t(purchaseTypeLabelKeys[type])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={debtorFilter || 'all'} onValueChange={(value) => setDebtorFilter(value === 'all' ? '' : value)}>
                  <SelectTrigger aria-label={t('invoices.filterDebtor')} className="min-w-[150px] max-w-[240px]">
                    <SelectValue placeholder={t('invoices.filterDebtor')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('invoices.filterDebtor')}</SelectItem>
                    {debtors.map((debtor) => <SelectItem key={debtor} value={debtor}>{debtor}</SelectItem>)}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('transactions.clearFilters')}
                    aria-label={t('transactions.clearFilters')}
                    onClick={() => {
                      setSearch('');
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
              {historyError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-destructive" role="alert">
                  <span>{historyError}</span>
                  <Button size="small" variant="outline" onClick={() => {
                      loadedHistoryRef.current = null;
                      setHistoryLoading(true);
                      setHistoryError('');
                      setHistoryReloadKey((key) => key + 1);
                    }}>
                      <RotateCcw size={14} />
                      {t('transactions.retry')}
                    </Button>
                </div>
              ) : historyLoading ? (
                <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : filteredTransactions.length === 0 ? (
                <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">
                  {transactions.length === 0 ? t('invoices.emptyHistory') : t('invoices.noMatches')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('transactions.fields.card')}</TableHead>
                        <TableHead>{t('transactions.fields.purchase')}</TableHead>
                        <TableHead>{t('transactions.fields.type')}</TableHead>
                        <TableHead>{t('transactions.fields.debtor')}</TableHead>
                        <TableHead>{t('transactions.fields.date')}</TableHead>
                        <TableHead className="text-right">{t('transactions.fields.installments')}</TableHead>
                        <TableHead>{t('transactions.fields.description')}</TableHead>
                        <TableHead className="text-right">{t('transactions.fields.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => renderPaidTransaction(
                        transaction,
                        selectedCard,
                        intlLocale,
                        amountFormatter,
                        t,
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ContentSection>
          </>
        )}
      </PageContainer>
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoices.pdf.selectDebtorsTitle')}</DialogTitle>
            <DialogDescription>
              {t('invoices.pdf.selectDebtorsDescription', { count: pdfDebtors.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/50">
              <input
                type="checkbox"
                checked={allPdfDebtorsSelected}
                ref={(element) => {
                  if (element) {
                    element.indeterminate = selectedPrintDebtors.length > 0 && !allPdfDebtorsSelected;
                  }
                }}
                onChange={() => setSelectedPrintDebtors(allPdfDebtorsSelected ? [] : pdfDebtors)}
                className="size-4 cursor-pointer rounded border-border accent-primary"
              />
              {t('invoices.pdf.selectAllDebtors')}
            </label>
            <div className="h-px bg-border" />
            {pdfDebtors.map((debtor) => (
              <label
                key={debtor || '__no-debtor'}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedPrintDebtors.includes(debtor)}
                  onChange={() => setSelectedPrintDebtors((current) => (
                    current.includes(debtor)
                      ? current.filter((value) => value !== debtor)
                      : [...current, debtor]
                  ))}
                  className="size-4 cursor-pointer rounded border-border accent-primary"
                />
                <span className="truncate">{debtor || t('invoices.pdf.noDebtorOption')}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleDownloadPdf()}
              disabled={selectedPrintDebtors.length === 0}
            >
              <Printer size={15} />
              {t('invoices.pdf.download')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function renderPaidTransaction(
  transaction: PaidTransaction,
  card: CreditCard | null,
  locale: string,
  amountFormatter: Intl.NumberFormat,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const isCredit = transaction.transactionType === 'credit';

  return (
    <TableRow key={transaction.id}>
      <TableCell>{card?.name ?? t('transactions.unknownCard')}</TableCell>
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
    </TableRow>
  );
}