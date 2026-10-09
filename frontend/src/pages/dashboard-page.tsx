import {
  Banknote,
  ChartNoAxesCombined,
  CreditCard as CreditCardIcon,
  Gauge,
  HandCoins,
  LayoutDashboard,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { ContentSection } from '../components/layout/content-section';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { listCreditCards } from '../lib/credit-card-api';
import { listAccounts } from '../lib/account-api';
import { getInvestmentSummary } from '../lib/investment-api';
import { getVariableIncomeSummary } from '../lib/variable-income-api';
import { purchaseTypeLabelKeys } from '../lib/transaction-labels';
import { listPurchaseLimits } from '../lib/purchase-limit-api';
import { listTransactions } from '../lib/transaction-api';
import { listPayments } from '../lib/payment-api';
import { getSnapshotEvolution } from '../lib/snapshot-api';
import { resolveIntlLocale } from '../lib/locale';
import { minorUnitsToNumber, sumMinorUnits, toMinorUnits } from '../lib/money';
import { useCurrencyFormatter } from '../lib/privacy-mode';
import type { CreditCard } from '../types/credit-card';
import type { Account } from '../types/account';
import type { InvestmentSummary } from '../types/investment';
import type { PurchaseLimit } from '../types/purchase-limit';
import type { PurchaseType, Transaction } from '../types/transaction';
import type { Payment } from '../types/payment';
import type { SnapshotEvolutionPoint } from '../types/snapshot';
import type { VariableIncomeSummary } from '../types/variable-income';

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

type AssetGroup = {
  key: string;
  label: string;
  amountCents: bigint;
  color: string;
  icon: React.ReactNode;
};

type AssetGroupSegment = AssetGroup & {
  percentage: number;
  endPercentage: number;
};

type ActiveAssetTooltip = {
  group: AssetGroupSegment;
  x: number;
  y: number;
};

function transactionNetAmount(transaction: Transaction): bigint {
  const amount = toMinorUnits(transaction.installmentAmount);
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [limits, setLimits] = useState<PurchaseLimit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [snapshotEvolution, setSnapshotEvolution] = useState<SnapshotEvolutionPoint[]>([]);
  const [fixedIncome, setFixedIncome] = useState<InvestmentSummary | null>(null);
  const [variableIncome, setVariableIncome] = useState<VariableIncomeSummary | null>(null);
  const [activeAssetTooltip, setActiveAssetTooltip] = useState<ActiveAssetTooltip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const locale = resolveIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const currencyFormatter = useCurrencyFormatter(locale);
  const formatCurrency = (amount: number) => currencyFormatter.format(amount);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      listCreditCards(controller.signal),
      listTransactions(controller.signal),
      listPayments(controller.signal),
      listPurchaseLimits(controller.signal),
      listAccounts(controller.signal),
      getSnapshotEvolution(controller.signal),
      getInvestmentSummary(controller.signal),
      getVariableIncomeSummary(controller.signal),
    ])
      .then(([nextCards, nextTransactions, nextPayments, nextLimits, nextAccounts, nextSnapshotEvolution, nextFixedIncome, nextVariableIncome]) => {
        if (controller.signal.aborted) return;
        setCards(nextCards);
        setTransactions(nextTransactions);
        setPayments(nextPayments);
        setLimits(nextLimits);
        setAccounts(nextAccounts);
        setSnapshotEvolution(nextSnapshotEvolution);
        setFixedIncome(nextFixedIncome);
        setVariableIncome(nextVariableIncome);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : t('common.error'));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [t]);

  const totalAmountCents = useMemo(
    () => transactions.reduce((total, transaction) => total + transactionNetAmount(transaction), 0n),
    [transactions],
  );
  const totalAmount = minorUnitsToNumber(totalAmountCents);
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const futurePaymentsCents = useMemo(
    () => sumMinorUnits(
      payments
        .filter((payment) => payment.date !== null && payment.date >= today)
        .map((payment) => payment.amount),
    ),
    [payments, today],
  );
  const assetGroups = useMemo<AssetGroup[]>(() => {
    const eligibleAccounts = accounts.filter((account) => (
      account.accountType === 'checking' || account.accountType === 'savings'
    ));
    const futurePaymentsByAccount = new Map<number, bigint>();
    for (const payment of payments) {
      if (payment.date === null || payment.date < today) continue;
      futurePaymentsByAccount.set(
        payment.accountId,
        (futurePaymentsByAccount.get(payment.accountId) ?? 0n) + toMinorUnits(payment.amount),
      );
    }
    const projectedAccountBalanceCents = eligibleAccounts.reduce((total, account) => (
      total
      + toMinorUnits(account.balance)
      - (futurePaymentsByAccount.get(account.id) ?? 0n)
    ), 0n);
    const fixedIncomeBySubtype = new Map<string, bigint>();
    for (const investment of fixedIncome?.investments ?? []) {
      fixedIncomeBySubtype.set(
        investment.subtype,
        (fixedIncomeBySubtype.get(investment.subtype) ?? 0n) + toMinorUnits(investment.amount),
      );
    }
    const fixedIncomeColors = ['#7c3aed', '#0891b2', '#c026d3', '#4f46e5', '#a16207'];
    const fixedIncomeGroups = [...fixedIncomeBySubtype.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([subtype, amountCents], index): AssetGroup => ({
        key: `fixedIncome-${subtype}`,
        label: t(`rendaFixa.subtypes.${subtype}`, { defaultValue: subtype }),
        amountCents,
        color: fixedIncomeColors[index % fixedIncomeColors.length],
        icon: <Banknote size={17} />,
      }));

    return [
      {
        key: 'accounts',
        label: t('dashboard.accounts'),
        amountCents: projectedAccountBalanceCents,
        color: '#3b82f6',
        icon: <Wallet size={17} />,
      },
      ...fixedIncomeGroups,
      {
        key: 'variableIncome',
        label: t('dashboard.variableIncome'),
        amountCents: toMinorUnits(variableIncome?.total ?? '0'),
        color: '#10b981',
        icon: <ChartNoAxesCombined size={17} />,
      },
    ];
  }, [accounts, payments, today, fixedIncome, variableIncome, t]);
  const totalAssetCents = useMemo(
    () => assetGroups.reduce((total, group) => total + group.amountCents, 0n),
    [assetGroups],
  );
  const totalAssetAmount = minorUnitsToNumber(totalAssetCents);
  const portfolioEvolution = useMemo(() => {
    const amounts = snapshotEvolution.map((point) => toMinorUnits(point.amount));
    const numericAmounts = amounts.map((amount) => Number(amount) / 100);
    const minimum = numericAmounts.length > 0 ? Math.min(...numericAmounts) : 0;
    const maximum = numericAmounts.length > 0 ? Math.max(...numericAmounts) : 0;
    const padding = Math.max((maximum - minimum) * 0.12, Math.abs(maximum) * 0.025, 1);
    const lowerBound = minimum - padding;
    const upperBound = maximum + padding;
    const chartTop = 24;
    const chartBottom = 184;
    const chartLeft = 145;
    const chartRight = 972;
    const axisTicks = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      return {
        y: chartBottom - ratio * (chartBottom - chartTop),
        value: lowerBound + ratio * (upperBound - lowerBound),
      };
    });
    const points = snapshotEvolution.map((point, index) => {
      const value = numericAmounts[index];
      const x = snapshotEvolution.length < 2
        ? (chartLeft + chartRight) / 2
        : chartLeft + (index * (chartRight - chartLeft)) / (snapshotEvolution.length - 1);
      const y = chartBottom - ((value - lowerBound) / (upperBound - lowerBound)) * (chartBottom - chartTop);
      return { ...point, value, x, y };
    });
    const lastAmount = amounts.at(-1) ?? 0n;
    const previousAmount = amounts.length > 1 ? amounts[amounts.length - 2] : null;
    const change = previousAmount === null ? null : lastAmount - previousAmount;
    const percentage = previousAmount === null || previousAmount === 0n
      ? null
      : Number(lastAmount - previousAmount) / Number(previousAmount);

    return {
      points,
      axisTicks,
      polyline: points.map(({ x, y }) => `${x},${y}`).join(' '),
      change,
      percentage,
    };
  }, [snapshotEvolution]);
  const portfolioPercentageFormatter = useMemo(() => new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'always',
    maximumFractionDigits: 2,
  }), [locale]);
  const portfolioMonthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: '2-digit',
  }), [locale]);
  const formattedTotalAssets = formatCurrency(totalAssetAmount);
  const totalAssetsFontSize = Math.max(11, Math.min(20, 230 / formattedTotalAssets.length));
  const absoluteAssetWeight = assetGroups.reduce(
    (total, group) => total + (group.amountCents < 0n ? -group.amountCents : group.amountCents),
    0n,
  );
  const assetGroupSegments = useMemo<AssetGroupSegment[]>(() => {
    if (absoluteAssetWeight === 0n) {
      return assetGroups.map((group) => ({ ...group, percentage: 0, endPercentage: 0 }));
    }
    let endPercentage = 0;
    return assetGroups.map((group) => {
      const weight = group.amountCents < 0n ? -group.amountCents : group.amountCents;
      const percentage = Number((weight * 1_000_000n) / absoluteAssetWeight) / 10_000;
      endPercentage += percentage;
      return { ...group, percentage, endPercentage };
    });
  }, [absoluteAssetWeight, assetGroups]);
  const chartGradient = useMemo(() => {
    if (absoluteAssetWeight === 0n) return 'conic-gradient(#e5e7eb 0% 100%)';
    let startPercentage = 0;
    const segments = assetGroupSegments.map((segment, index) => {
      const start = startPercentage;
      const end = index === assetGroupSegments.length - 1 ? 100 : segment.endPercentage;
      startPercentage = end;
      return `${segment.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [absoluteAssetWeight, assetGroupSegments]);
  function handleAssetChartMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (absoluteAssetWeight === 0n) {
      setActiveAssetTooltip(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const offsetX = event.clientX - bounds.left - centerX;
    const offsetY = event.clientY - bounds.top - centerY;
    const radius = Math.sqrt(offsetX ** 2 + offsetY ** 2);
    const chartRadius = Math.min(bounds.width, bounds.height) / 2;
    if (radius < chartRadius * 0.8 || radius > chartRadius) {
      setActiveAssetTooltip(null);
      return;
    }

    const angle = (Math.atan2(offsetY, offsetX) * 180 / Math.PI + 450) % 360;
    const percentageAtPointer = angle / 3.6;
    const group = assetGroupSegments.find((segment) => (
      segment.percentage > 0 && percentageAtPointer < segment.endPercentage
    )) ?? assetGroupSegments.at(-1);
    if (!group) {
      setActiveAssetTooltip(null);
      return;
    }

    setActiveAssetTooltip({
      group,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }
  const totalsByCard = useMemo(() => {
    const totals = new Map<number, bigint>();
    for (const transaction of transactions) {
      totals.set(
        transaction.creditCardId,
        (totals.get(transaction.creditCardId) ?? 0n) + transactionNetAmount(transaction),
      );
    }

    return cards
      .map((card) => ({
        key: String(card.id),
        name: card.name,
        amount: minorUnitsToNumber(totals.get(card.id) ?? 0n),
      }))
      .sort((left, right) => right.amount - left.amount);
  }, [cards, transactions]);
  const totalsByDebtor = useMemo(() => {
    const totals = new Map<string, bigint>();
    for (const transaction of transactions) {
      const debtor = transaction.debtor?.trim() || '';
      if (!debtor) continue;
      totals.set(debtor, (totals.get(debtor) ?? 0n) + transactionNetAmount(transaction));
    }

    return [
      ...Array.from(totals, ([debtor, amount]) => ({
        key: debtor,
        name: debtor,
        amount: minorUnitsToNumber(amount < 0n ? -amount : amount),
      })),
      {
        key: 'rodrigo',
        name: t('dashboard.unassignedDebtor'),
        amount: minorUnitsToNumber(totalAmountCents < 0n ? -totalAmountCents : totalAmountCents),
      },
    ].sort((left, right) => right.amount - left.amount);
  }, [transactions, totalAmountCents, t]);
  const usedByPurchaseType = useMemo(() => {
    const totals = new Map<PurchaseType, bigint>(PURCHASE_TYPES.map((type) => [type, 0n]));
    for (const transaction of transactions) {
      totals.set(
        transaction.purchaseType,
        (totals.get(transaction.purchaseType) ?? 0n) + transactionNetAmount(transaction),
      );
    }
    return totals;
  }, [transactions]);
  const dailySpendAvailable = useMemo(() => {
    const dayOfMonth = currentDate.getDate();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const limitByType = new Map(limits.map((limit) => [limit.purchaseType, toMinorUnits(limit.amount)]));
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const today = `${currentMonth}-${String(dayOfMonth).padStart(2, '0')}`;
    const fortnightSpent = (type: PurchaseType) => transactions
      .filter((transaction) => (
        transaction.purchaseType === type
        && transaction.date.startsWith(`${currentMonth}-`)
        && transaction.date <= today
      ))
      .reduce((total, transaction) => total + transactionNetAmount(transaction), 0n);
    // Replica a regra da planilha: divide o saldo da quinzena pelos dias restantes nela.
    const firstFortnightRemaining =
      (limitByType.get('first_fortnight') ?? 0n)
      - fortnightSpent('first_fortnight');
    const secondFortnightRemaining =
      (limitByType.get('second_fortnight') ?? 0n)
      - fortnightSpent('second_fortnight');

    if (dayOfMonth < 15) {
      return minorUnitsToNumber(firstFortnightRemaining) / (15 - dayOfMonth);
    }
    if (dayOfMonth < 28) {
      return minorUnitsToNumber(secondFortnightRemaining) / (28 - dayOfMonth);
    }
    return minorUnitsToNumber(firstFortnightRemaining) / (daysInMonth - dayOfMonth + 15);
  }, [currentDate, limits, transactions]);
  const greeting = t(getGreetingKey());

  return (
    <AppLayout
      currentPage="dashboard"
      onNavigate={onNavigate}
    >
      <PageContainer>
        <PageHeader section={greeting} title={t('dashboard.title')} />

        {!loadError && !isLoading && (
          <ContentSection className="order-3">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
                <ChartNoAxesCombined size={17} className="text-primary" />
                {t('dashboard.assetsOverview')}
              </h2>
              <p className="mb-0 mt-1 text-xs text-muted-foreground">
                {t('dashboard.assetsOverviewDescription')}
              </p>
            </div>
            <div className="grid items-center gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(220px,0.8fr)_1.2fr] lg:gap-10">
              <div className="flex justify-center">
                <div
                  className="relative grid size-52 place-items-center rounded-full p-5 shadow-inner"
                  style={{ background: chartGradient }}
                  role="img"
                  aria-label={t('dashboard.assetsChartLabel', { amount: formatCurrency(totalAssetAmount) })}
                  onMouseMove={handleAssetChartMouseMove}
                  onMouseLeave={() => setActiveAssetTooltip(null)}
                >
                  {activeAssetTooltip && (
                    <div
                      className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
                      style={{ left: activeAssetTooltip.x, top: activeAssetTooltip.y }}
                      role="status"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: activeAssetTooltip.group.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{activeAssetTooltip.group.label}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                        <span className="tabular-nums text-muted-foreground">
                          {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
                            .format(activeAssetTooltip.group.percentage)}%
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(minorUnitsToNumber(activeAssetTooltip.group.amountCents))}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="grid size-full content-center justify-items-center rounded-full bg-card text-center shadow-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {t('dashboard.assetsTotal')}
                    </span>
                    <span
                      className="mt-1 w-full whitespace-nowrap px-1 font-bold tabular-nums tracking-tight text-foreground"
                      style={{ fontSize: `${totalAssetsFontSize}px` }}
                    >
                      {formattedTotalAssets}
                    </span>
                  </div>
                </div>
              </div>
              <ul className="m-0 list-none space-y-5 p-0">
                {assetGroups.map((group) => {
                  const weight = group.amountCents < 0n ? -group.amountCents : group.amountCents;
                  const percentage = absoluteAssetWeight > 0n
                    ? Number((weight * 10000n) / absoluteAssetWeight) / 100
                    : 0;
                  return (
                    <li key={group.key}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="grid size-9 shrink-0 place-items-center rounded-lg"
                            style={{ color: group.color, backgroundColor: `${group.color}1a` }}
                            aria-hidden="true"
                          >
                            {group.icon}
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">{group.label}</span>
                        </div>
                        <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                          {formatCurrency(minorUnitsToNumber(group.amountCents))}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 pl-[2.875rem]">
                        <div
                          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-label={t('dashboard.assetShare', { name: group.label })}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(percentage)}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: group.color,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                          {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(percentage)}%
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </ContentSection>
        )}

        {!loadError && !isLoading && (
          <ContentSection className="order-4">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
                <TrendingUp size={17} className="text-primary" />
                {t('dashboard.portfolioEvolution')}
              </h2>
              <p className="mb-0 mt-1 text-xs text-muted-foreground">
                {t('dashboard.portfolioEvolutionDescription')}
              </p>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <p className="m-0 text-xs font-medium text-muted-foreground">
                  {t('dashboard.changeSinceSnapshot')}
                </p>
                {portfolioEvolution.change === null ? (
                  <p className="mb-0 mt-1 text-sm text-muted-foreground">
                    {t('dashboard.snapshotNoHistory')}
                  </p>
                ) : (
                  <p className={`mb-0 mt-1 flex flex-wrap items-baseline gap-x-2 text-xl font-bold tabular-nums ${
                    portfolioEvolution.change > 0n
                      ? 'text-emerald-600'
                      : portfolioEvolution.change < 0n ? 'text-destructive' : 'text-foreground'
                  }`}>
                    <span>{formatCurrency(minorUnitsToNumber(portfolioEvolution.change))}</span>
                    {portfolioEvolution.percentage === null ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('dashboard.snapshotPercentageUnavailable')}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold">
                        {portfolioPercentageFormatter.format(portfolioEvolution.percentage)}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {portfolioEvolution.points.length > 0 ? (
              <div className="px-3 pb-4 sm:px-5">
                <svg
                  className="h-48 w-full overflow-visible"
                  viewBox="0 0 1000 200"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={t('dashboard.portfolioEvolutionChartLabel')}
                >
                  {portfolioEvolution.axisTicks.map((tick) => (
                    <g key={tick.y}>
                      <line
                        x1="145"
                        x2="972"
                        y1={tick.y}
                        y2={tick.y}
                        stroke="currentColor"
                        strokeDasharray="4 7"
                        className="text-border"
                      />
                      <text
                        x="135"
                        y={tick.y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontSize="12"
                        className="fill-muted-foreground"
                      >
                        {formatCurrency(tick.value)}
                      </text>
                    </g>
                  ))}
                  {portfolioEvolution.points.length > 1 ? (
                    <polyline
                      points={portfolioEvolution.polyline}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    />
                  ) : null}
                  {portfolioEvolution.points.map((point, index) => (
                    <circle
                      key={point.month}
                      cx={point.x}
                      cy={point.y}
                      r={index === portfolioEvolution.points.length - 1 ? 7 : 5}
                      fill="currentColor"
                      className={index === portfolioEvolution.points.length - 1
                        ? 'text-emerald-600'
                        : 'text-primary'}
                    >
                      <title>
                        {portfolioMonthFormatter.format(new Date(`${point.month}-01T12:00:00`))}
                        {`: ${formatCurrency(point.value)}`}
                      </title>
                    </circle>
                  ))}
                  {portfolioEvolution.points.map((point, index) => (
                    <text
                      key={`${point.month}-value`}
                      x={point.x}
                      y={Math.max(point.y - 12, 12)}
                      textAnchor={index === 0 ? 'start' : index === portfolioEvolution.points.length - 1 ? 'end' : 'middle'}
                      fontSize="11"
                      fontWeight="600"
                      className="fill-foreground"
                    >
                      {formatCurrency(point.value)}
                    </text>
                  ))}
                </svg>
                <div
                  className="grid gap-1 px-1 text-center text-[10px] text-muted-foreground sm:text-xs"
                  style={{ gridTemplateColumns: `repeat(${portfolioEvolution.points.length}, minmax(0, 1fr))` }}
                >
                  {portfolioEvolution.points.map((point) => {
                    const month = new Date(`${point.month}-01T12:00:00`);
                    return (
                      <span
                        key={point.month}
                        className="truncate"
                        title={portfolioMonthFormatter.format(month)}
                      >
                        {portfolioMonthFormatter.format(month)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="m-0 px-5 pb-5 text-sm text-muted-foreground">
                {t('dashboard.snapshotNoData')}
              </p>
            )}
          </ContentSection>
        )}

        {!loadError && !isLoading && futurePaymentsCents > 0n && (
          <ContentSection className="order-2 border-amber-200 bg-amber-50">
            <div className="flex items-center justify-between gap-4 px-5 py-2.5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                  <HandCoins size={17} />
                </span>
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-sm font-semibold text-amber-950">
                    {t('dashboard.futurePayments')}
                  </h2>
                </div>
              </div>
              <span className="shrink-0 text-right text-sm font-bold tabular-nums text-amber-900 sm:text-base">
                {formatCurrency(minorUnitsToNumber(futurePaymentsCents))}
              </span>
            </div>
          </ContentSection>
        )}

        {loadError ? (
          <ContentSection className="order-1">
            <p className="m-0 px-4 py-8 text-center text-sm text-destructive" role="alert">{loadError}</p>
          </ContentSection>
        ) : isLoading ? (
          <ContentSection className="order-1">
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
          <ContentSection className="order-1">
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
                      const used = minorUnitsToNumber(usedByPurchaseType.get(limit.purchaseType) ?? 0n);
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
