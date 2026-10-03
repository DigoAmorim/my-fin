import { CreditCard as CreditCardIcon, Gauge, LayoutDashboard, ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { ContentSection } from '../components/layout/content-section';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { listCreditCards } from '../lib/credit-card-api';
import { purchaseTypeLabelKeys } from '../lib/transaction-labels';
import { listPurchaseLimits } from '../lib/purchase-limit-api';
import { listTransactions } from '../lib/transaction-api';
import { createCurrencyFormatter } from '../lib/utils';
import type { CreditCard } from '../types/credit-card';
import type { PurchaseLimit } from '../types/purchase-limit';
import type { PurchaseType, Transaction } from '../types/transaction';

const PURCHASE_TYPES: PurchaseType[] = [
  'first_fortnight',
  'second_fortnight',
  'recurring',
  'installment_plan',
];

type DashboardPageProps = {
  onNavigate: (page: AppPage) => void;
};

type NetTotal = {
  key: string;
  name: string;
  amount: number;
};

function transactionNetAmount(transaction: Transaction): number {
  const amount = Number(transaction.installmentAmount);
  if (!Number.isFinite(amount)) return 0;
  // Créditos reduzem o gasto líquido em todos os resumos e limites do painel.
  return transaction.transactionType === 'credit' ? -amount : amount;
}

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.greetingMorning';
  if (hour < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
}

function SummaryList({
  title,
  icon,
  rows,
  emptyMessage,
  formatCurrency,
}: {
  title: string;
  icon: React.ReactNode;
  rows: NetTotal[];
  emptyMessage: string;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <section className="min-w-0 bg-card px-4 py-4 sm:px-5">
      <h2 className="mb-3 mt-0 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="m-0 max-h-52 list-none space-y-3 overflow-y-auto p-0">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-foreground">{row.name}</span>
              <span className={`shrink-0 font-semibold tabular-nums ${row.amount < 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                {formatCurrency(row.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { t, i18n } = useTranslation();
  const [currentDate] = useState(() => new Date());
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [limits, setLimits] = useState<PurchaseLimit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith('pt') ? 'pt-BR' : 'en-US';
  const currencyFormatter = useMemo(
    () => createCurrencyFormatter(locale),
    [locale],
  );
  const formatCurrency = (amount: number) => currencyFormatter.format(amount);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      listCreditCards(controller.signal),
      listTransactions(controller.signal),
      listPurchaseLimits(controller.signal),
    ])
      .then(([nextCards, nextTransactions, nextLimits]) => {
        if (controller.signal.aborted) return;
        setCards(nextCards);
        setTransactions(nextTransactions);
        setLimits(nextLimits);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : t('common.error'));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [t]);

  const totalAmount = useMemo(
    () => transactions.reduce((total, transaction) => total + transactionNetAmount(transaction), 0),
    [transactions],
  );
  const totalsByCard = useMemo(() => {
    const totals = new Map<number, number>();
    for (const transaction of transactions) {
      totals.set(
        transaction.creditCardId,
        (totals.get(transaction.creditCardId) ?? 0) + transactionNetAmount(transaction),
      );
    }

    return cards
      .map((card) => ({ key: String(card.id), name: card.name, amount: totals.get(card.id) ?? 0 }))
      .sort((left, right) => right.amount - left.amount);
  }, [cards, transactions]);
  const totalsByDebtor = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of transactions) {
      const debtor = transaction.debtor?.trim() || '';
      if (!debtor) continue;
      totals.set(debtor, (totals.get(debtor) ?? 0) + transactionNetAmount(transaction));
    }

    return [
      ...Array.from(totals, ([debtor, amount]) => ({
        key: debtor,
        name: debtor,
        amount: Math.abs(amount),
      })),
      {
        key: 'rodrigo',
        name: t('dashboard.unassignedDebtor'),
        amount: Math.abs(totalAmount),
      },
    ].sort((left, right) => right.amount - left.amount);
  }, [transactions, totalAmount, t]);
  const usedByPurchaseType = useMemo(() => {
    const totals = new Map<PurchaseType, number>(PURCHASE_TYPES.map((type) => [type, 0]));
    for (const transaction of transactions) {
      totals.set(
        transaction.purchaseType,
        (totals.get(transaction.purchaseType) ?? 0) + transactionNetAmount(transaction),
      );
    }
    return totals;
  }, [transactions]);
  const dailySpendAvailable = useMemo(() => {
    const dayOfMonth = currentDate.getDate();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const limitByType = new Map(limits.map((limit) => [limit.purchaseType, Number(limit.amount)]));
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const today = `${currentMonth}-${String(dayOfMonth).padStart(2, '0')}`;
    const fortnightSpent = (type: PurchaseType) => transactions
      .filter((transaction) => (
        transaction.purchaseType === type
        && transaction.date.startsWith(`${currentMonth}-`)
        && transaction.date <= today
      ))
      .reduce((total, transaction) => total + transactionNetAmount(transaction), 0);
    // Replica a regra da planilha: divide o saldo da quinzena pelos dias restantes nela.
    const firstFortnightRemaining =
      (limitByType.get('first_fortnight') ?? 0)
      - fortnightSpent('first_fortnight');
    const secondFortnightRemaining =
      (limitByType.get('second_fortnight') ?? 0)
      - fortnightSpent('second_fortnight');

    if (dayOfMonth < 15) {
      return firstFortnightRemaining / (15 - dayOfMonth);
    }
    if (dayOfMonth < 28) {
      return secondFortnightRemaining / (28 - dayOfMonth);
    }
    return firstFortnightRemaining / (daysInMonth - dayOfMonth + 15);
  }, [currentDate, limits, transactions]);
  const greeting = t(getGreetingKey());

  return (
    <AppLayout
      currentPage="dashboard"
      onNavigate={onNavigate}
    >
      <PageContainer>
        <PageHeader section={greeting} title={t('dashboard.title')} />

        {loadError ? (
          <ContentSection>
            <p className="m-0 px-4 py-8 text-center text-sm text-destructive" role="alert">{loadError}</p>
          </ContentSection>
        ) : isLoading ? (
          <ContentSection>
            <div className="grid animate-pulse gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="space-y-3">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-5 w-36 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              ))}
            </div>
          </ContentSection>
        ) : (
          <ContentSection>
            <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-[1.05fr_1fr_1fr_1.2fr]">
              <section className="bg-card px-5 py-5 sm:px-6">
                <h2 className="mb-2 mt-0 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <ReceiptText size={14} />
                  {t('dashboard.total')}
                </h2>
                <p className={`m-0 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${totalAmount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {formatCurrency(totalAmount)}
                </p>
                <p className="mb-0 mt-3 text-xs text-muted-foreground">
                  {t('transactions.resultCount', { count: transactions.length })}
                </p>
                <p className="mb-0 mt-2 text-xs text-muted-foreground">
                  {t('dashboard.dailySpendAvailable')}
                </p>
                <p className="mb-0 mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(dailySpendAvailable)}
                </p>
              </section>

              <SummaryList
                title={t('dashboard.cards')}
                icon={<CreditCardIcon size={14} />}
                rows={totalsByCard}
                emptyMessage={t('dashboard.emptyCards')}
                formatCurrency={formatCurrency}
              />
              <SummaryList
                title={t('dashboard.debtors')}
                icon={<LayoutDashboard size={14} />}
                rows={totalsByDebtor}
                emptyMessage={t('dashboard.emptyDebtors')}
                formatCurrency={formatCurrency}
              />

              <section className="min-w-0 bg-card px-4 py-4 sm:px-5">
                <h2 className="mb-3 mt-0 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Gauge size={14} />
                  {t('dashboard.limits')}
                </h2>
                {limits.length === 0 ? (
                  <p className="m-0 text-sm text-muted-foreground">{t('dashboard.emptyLimits')}</p>
                ) : (
                  <ul className="m-0 max-h-52 list-none space-y-3 overflow-y-auto p-0">
                    {limits.map((limit) => {
                      const used = usedByPurchaseType.get(limit.purchaseType) ?? 0;
                      const amount = Number(limit.amount);
                      const percentage = amount > 0 ? Math.max(0, (used / amount) * 100) : 0;
                      const label = t(purchaseTypeLabelKeys[limit.purchaseType]);
                      return (
                        <li key={limit.id}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {Math.round(percentage)}%
                            </span>
                          </div>
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-label={t('dashboard.limitProgress', { name: label })}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.min(100, Math.max(0, Math.round(percentage)))}
                          >
                            <div
                              className={`h-full rounded-full transition-all ${percentage >= 100 ? 'bg-rose-500' : percentage >= 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                            />
                          </div>
                          <p className="mb-0 mt-1 flex items-center justify-between gap-2 text-[10px] tabular-nums text-muted-foreground">
                            <span>{formatCurrency(used)}</span>
                            <span>{formatCurrency(amount)}</span>
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </ContentSection>
        )}

      </PageContainer>
    </AppLayout>
  );
}
