import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppPage } from './components/layout/app-layout';

const DashboardPage = lazy(() =>
  import('./pages/dashboard-page').then(({ DashboardPage }) => ({ default: DashboardPage })),
);
const AccountsPage = lazy(() =>
  import('./pages/accounts-page').then(({ AccountsPage }) => ({ default: AccountsPage })),
);
const FixedIncomePage = lazy(() =>
  import('./pages/fixed-income-page').then(({ FixedIncomePage }) => ({ default: FixedIncomePage })),
);
const VariableIncomePage = lazy(() =>
  import('./pages/variable-income-page').then(({ VariableIncomePage }) => ({ default: VariableIncomePage })),
);
const CreditCardsPage = lazy(() =>
  import('./pages/credit-cards-page').then(({ CreditCardsPage }) => ({ default: CreditCardsPage })),
);
const InvoicesPage = lazy(() =>
  import('./pages/invoices-page').then(({ InvoicesPage }) => ({ default: InvoicesPage })),
);
const PurchaseLimitsPage = lazy(() =>
  import('./pages/purchase-limits-page').then(({ PurchaseLimitsPage }) => ({ default: PurchaseLimitsPage })),
);
const OpenFinancePage = lazy(() =>
  import('./pages/open-finance-page').then(({ OpenFinancePage }) => ({ default: OpenFinancePage })),
);
const TransactionsPage = lazy(() =>
  import('./pages/transactions-page').then(({ TransactionsPage }) => ({ default: TransactionsPage })),
);
const PaymentsPage = lazy(() =>
  import('./pages/payments-page').then(({ PaymentsPage }) => ({ default: PaymentsPage })),
);
const YieldsPage = lazy(() =>
  import('./pages/yields-page').then(({ YieldsPage }) => ({ default: YieldsPage })),
);

function PageLoading() {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
      role="status"
    >
      {t('common.loading')}
    </div>
  );
}

function renderPage(page: AppPage, onNavigate: (nextPage: AppPage) => void) {
  switch (page) {
    case 'dashboard':
      return <DashboardPage onNavigate={onNavigate} />;
    case 'accounts':
      return <AccountsPage onNavigate={onNavigate} />;
    case 'fixedIncome':
      return <FixedIncomePage onNavigate={onNavigate} />;
    case 'variableIncome':
      return <VariableIncomePage onNavigate={onNavigate} />;
    case 'transactions':
      return <TransactionsPage onNavigate={onNavigate} />;
    case 'payments':
      return <PaymentsPage onNavigate={onNavigate} />;
    case 'yields':
      return <YieldsPage onNavigate={onNavigate} />;
    case 'invoices':
      return <InvoicesPage onNavigate={onNavigate} />;
    case 'limits':
      return <PurchaseLimitsPage onNavigate={onNavigate} />;
    case 'openFinance':
      return <OpenFinancePage onNavigate={onNavigate} />;
    case 'creditCards':
      return <CreditCardsPage onNavigate={onNavigate} />;
  }
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>('dashboard');

  return (
    <Suspense fallback={<PageLoading />}>
      {renderPage(activePage, setActivePage)}
    </Suspense>
  );
}

export default App;
