import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppPage } from './components/layout/app-layout';

const CreditCardsPage = lazy(() =>
  import('./pages/credit-cards-page').then(({ CreditCardsPage }) => ({ default: CreditCardsPage })),
);
const InvoicesPage = lazy(() =>
  import('./pages/invoices-page').then(({ InvoicesPage }) => ({ default: InvoicesPage })),
);
const TransactionsPage = lazy(() =>
  import('./pages/transactions-page').then(({ TransactionsPage }) => ({ default: TransactionsPage })),
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

function App() {
  const [activePage, setActivePage] = useState<AppPage>('transactions');

  return (
    <Suspense fallback={<PageLoading />}>
      {activePage === 'transactions' ? (
        <TransactionsPage onNavigate={setActivePage} />
      ) : activePage === 'invoices' ? (
        <InvoicesPage onNavigate={setActivePage} />
      ) : (
        <CreditCardsPage onNavigate={setActivePage} />
      )}
    </Suspense>
  );
}

export default App;
