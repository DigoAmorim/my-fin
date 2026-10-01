import { useState } from 'react';
import type { AppPage } from './components/layout/app-layout';
import { CreditCardsPage } from './pages/credit-cards-page';
import { TransactionsPage } from './pages/transactions-page';

function App() {
  const [activePage, setActivePage] = useState<AppPage>('creditCards');

  return activePage === 'transactions'
    ? <TransactionsPage onNavigate={setActivePage} />
    : <CreditCardsPage onNavigate={setActivePage} />;
}

export default App;
