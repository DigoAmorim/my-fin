import { ChartColumn, CreditCard, Languages, Landmark, Menu, PiggyBank, ReceiptText } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export type AppPage = 'creditCards' | 'transactions';

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
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleLanguage: () => void;
};

export function AppLayout({
  children,
  currentPage,
  onNavigate,
  sidebarOpen,
  onToggleSidebar,
  onToggleLanguage,
}: AppLayoutProps) {
  const { t } = useTranslation();

  // Estrutura compartilhada da aplicação: navegação lateral, controle mobile e conteúdo da página.
  return (
    <div className="flex min-h-screen bg-background max-md:relative max-md:block">
      <aside className={`flex w-[208px] shrink-0 flex-col gap-[0.85rem] border-r border-border bg-card p-2 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:w-[min(82vw,260px)] max-md:transition-transform ${sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-[102%]'}`}>
        <div className="flex min-h-11 items-center gap-[0.55rem] border-b border-border px-[0.45rem] pb-[0.45rem]">
          <div className="grid size-6 shrink-0 place-items-center bg-transparent text-primary">
            <CreditCard size={17} />
          </div>
          <div>
            <strong className="block text-[0.95rem] leading-none text-foreground">{t('app.name')}</strong>
          </div>
          <div className="ml-auto flex items-center gap-[0.15rem]">
            <button type="button" className="inline-flex size-[1.8rem] items-center justify-center rounded-[0.4rem] border-0 bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" onClick={onToggleLanguage} aria-label={t('toolbar.language')} title={t('toolbar.language')}>
              <Languages size={16} />
            </button>
          </div>
        </div>

        <nav className="flex flex-col gap-4" aria-label={t('nav.menu')}>
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{t('nav.groupAccounts')}</span>
            <button
              type="button"
              aria-current={currentPage === 'creditCards' ? 'page' : undefined}
              onClick={() => onNavigate('creditCards')}
              className={navItemClass(currentPage === 'creditCards')}
            >
              <CreditCard size={17} />
              <span>{t('nav.creditCards')}</span>
            </button>
            <button
              type="button"
              aria-current={currentPage === 'transactions' ? 'page' : undefined}
              onClick={() => onNavigate('transactions')}
              className={navItemClass(currentPage === 'transactions')}
            >
              <ReceiptText size={17} />
              <span>{t('nav.transactions')}</span>
            </button>
            <button type="button" className="flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Landmark size={17} />
              <span>{t('nav.overview')}</span>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{t('nav.groupAnalysis')}</span>
            <button type="button" className="flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <ChartColumn size={17} />
              <span>{t('nav.reports')}</span>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{t('nav.groupSettings')}</span>
            <button type="button" className="flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <PiggyBank size={17} />
              <span>{t('nav.budgets')}</span>
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
            onClick={onToggleSidebar}
          >
            <Menu size={20} />
          </button>
        </header>

        {children}
      </main>
    </div>
  );
}
