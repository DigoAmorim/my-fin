import { BadgeDollarSign, CreditCard, Gauge, Globe, Languages, LayoutDashboard, Menu, Receipt, ReceiptText, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

/** Destinos disponíveis na navegação principal da aplicação. */
export type AppPage = 'dashboard' | 'accounts' | 'fixedIncome' | 'creditCards' | 'limits' | 'openFinance' | 'transactions' | 'invoices';

function navItemClass(isActive: boolean): string {
  return cn(
    'flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-l-2 px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] transition-colors',
    isActive
      ? 'border-primary bg-accent text-accent-foreground'
      : 'border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );
}

type AppLayoutProps = {
  children: ReactNode;
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
};

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  const { t, i18n } = useTranslation();
  // O layout centraliza o menu para que todas as páginas compartilhem o mesmo comportamento mobile.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleLanguage = () => {
    const language = i18n.resolvedLanguage ?? i18n.language;
    void i18n.changeLanguage(language.toLowerCase().startsWith('pt') ? 'en' : 'pt-BR');
  };
  const closeSidebar = () => setSidebarOpen(false);
  const navigateTo = (page: AppPage) => {
    onNavigate(page);
    closeSidebar();
  };

  // Estrutura compartilhada da aplicação: navegação lateral, controle mobile e conteúdo da página.
  return (
    <div className="flex min-h-screen bg-background max-md:relative max-md:block">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-10 bg-black/40 max-md:block md:hidden"
          aria-label={t('toolbar.closeMenu')}
          onClick={closeSidebar}
        />
      )}
      <aside
        id="app-sidebar"
        className={cn(
          'flex w-[208px] shrink-0 flex-col gap-[0.85rem] border-r border-border bg-card p-2 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:w-[min(82vw,260px)] max-md:transition-transform',
          sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-[102%]',
        )}
      >
        <div className="flex min-h-11 items-center gap-[0.55rem] border-b border-border px-[0.45rem] pb-[0.45rem]">
          <div className="grid size-6 shrink-0 place-items-center bg-transparent text-primary">
            <CreditCard size={17} />
          </div>
          <div>
            <strong className="block text-[0.95rem] leading-none text-foreground">{t('app.name')}</strong>
          </div>
          <div className="ml-auto flex items-center gap-[0.15rem]">
            <button type="button" className="inline-flex size-[1.8rem] items-center justify-center rounded-[0.4rem] border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={toggleLanguage} aria-label={t('toolbar.language')} title={t('toolbar.language')}>
              <Languages size={16} />
            </button>
          </div>
        </div>

        <nav className="flex flex-col gap-4" aria-label={t('nav.menu')}>
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{t('nav.groupFeatures')}</span>
            <button
              type="button"
              aria-current={currentPage === 'dashboard' ? 'page' : undefined}
              onClick={() => navigateTo('dashboard')}
              className={navItemClass(currentPage === 'dashboard')}
            >
              <LayoutDashboard size={17} />
              <span>{t('nav.dashboard')}</span>
            </button>
            <button
              type="button"
              aria-current={currentPage === 'transactions' ? 'page' : undefined}
              onClick={() => navigateTo('transactions')}
              className={navItemClass(currentPage === 'transactions')}
            >
              <ReceiptText size={17} />
              <span>{t('nav.transactions')}</span>
            </button>
            <button
              type="button"
              aria-current={currentPage === 'invoices' ? 'page' : undefined}
              onClick={() => navigateTo('invoices')}
              className={navItemClass(currentPage === 'invoices')}
            >
              <Receipt size={17} />
              <span>{t('nav.invoices')}</span>
            </button>
            <button
              type="button"
              aria-current={currentPage === 'accounts' ? 'page' : undefined}
              onClick={() => navigateTo('accounts')}
              className={navItemClass(currentPage === 'accounts')}
            >
              <Wallet size={17} />
              <span>{t('nav.accounts')}</span>
            </button>
            <button
              type="button"
              aria-current={currentPage === 'fixedIncome' ? 'page' : undefined}
              onClick={() => navigateTo('fixedIncome')}
              className={navItemClass(currentPage === 'fixedIncome')}
            >
              <BadgeDollarSign size={17} />
              <span>{t('nav.fixedIncome')}</span>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{t('nav.groupSettings')}</span>
            <button
              type="button"
              aria-current={currentPage === 'creditCards' ? 'page' : undefined}
              onClick={() => navigateTo('creditCards')}
              className={navItemClass(currentPage === 'creditCards')}>
              <CreditCard size={17} />
              <span>{t('nav.creditCards')}</span>
            </button>
            <button
              type="button"
              aria-current={currentPage === 'limits' ? 'page' : undefined}
              onClick={() => navigateTo('limits')}
              className={navItemClass(currentPage === 'limits')}
            >
              <Gauge size={17} />
              <span>{t('nav.limits')}</span>
            </button>
            <button
              type="button"
              aria-current={currentPage === 'openFinance' ? 'page' : undefined}
              onClick={() => navigateTo('openFinance')}
              className={navItemClass(currentPage === 'openFinance')}
            >
              <Globe size={17} />
              <span>{t('nav.openFinance')}</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-0 items-center justify-start bg-transparent p-0 max-md:min-h-12 max-md:px-4">
          <button
            type="button"
            className="hidden size-8 items-center justify-center rounded-[0.45rem] border-0 bg-muted p-0 text-foreground max-md:flex"
            aria-label={t('toolbar.toggleMenu')}
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((isOpen) => !isOpen)}
          >
            <Menu size={20} />
          </button>
        </header>

        {children}
      </main>
    </div>
  );
}
