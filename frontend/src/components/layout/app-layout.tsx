import { ChartColumn, CreditCard, Languages, Landmark, Menu, PiggyBank } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type AppLayoutProps = {
  children: ReactNode;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleLanguage: () => void;
};

export function AppLayout({
  children,
  sidebarOpen,
  onToggleSidebar,
  onToggleLanguage,
}: AppLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] max-md:relative max-md:block">
      <aside className={`flex w-[208px] shrink-0 flex-col gap-[0.85rem] border-r border-[#e8ebef] bg-white p-2 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:w-[min(82vw,260px)] max-md:transition-transform ${sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-[102%]'}`}>
        <div className="flex min-h-11 items-center gap-[0.55rem] border-b border-[#eef0f3] px-[0.45rem] pb-[0.45rem]">
          <div className="grid size-6 shrink-0 place-items-center bg-transparent text-[#655cf5]">
            <CreditCard size={17} />
          </div>
          <div>
            <strong className="block text-[0.95rem] leading-none text-[#172033]">{t('app.name')}</strong>
          </div>
          <div className="ml-auto flex items-center gap-[0.15rem]">
            <button type="button" className="inline-flex size-[1.8rem] items-center justify-center rounded-[0.4rem] border-0 bg-transparent p-0 text-[#738097] transition-colors hover:bg-muted hover:text-[#334155]" onClick={onToggleLanguage} aria-label={t('toolbar.language')} title={t('toolbar.language')}>
              <Languages size={16} />
            </button>
          </div>
        </div>

        <nav className="flex flex-col gap-4" aria-label="Menu principal">
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#a0a9b8]">{t('nav.groupAccounts')}</span>
            <button type="button" className="flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-0 bg-[#f1f0ff] px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] text-[#5e58e8] [box-shadow:inset_2px_0_#655cf5] transition-colors hover:bg-[#f1f0ff] hover:text-[#5e58e8]">
              <CreditCard size={17} />
              <span>{t('nav.creditCards')}</span>
            </button>
            <button type="button" className="flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] text-slate-500 transition-colors hover:bg-[#f1f0ff] hover:text-[#5e58e8]">
              <Landmark size={17} />
              <span>{t('nav.overview')}</span>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#a0a9b8]">{t('nav.groupAnalysis')}</span>
            <button type="button" className="flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] text-slate-500 transition-colors hover:bg-[#f1f0ff] hover:text-[#5e58e8]">
              <ChartColumn size={17} />
              <span>{t('nav.reports')}</span>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="px-[0.65rem] py-[0.3rem] text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#a0a9b8]">{t('nav.groupSettings')}</span>
            <button type="button" className="flex cursor-pointer items-center gap-[0.65rem] rounded-[0.45rem] border-0 bg-transparent px-[0.65rem] py-[0.55rem] text-left text-[0.82rem] text-slate-500 transition-colors hover:bg-[#f1f0ff] hover:text-[#5e58e8]">
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
            className="hidden size-8 items-center justify-center rounded-[0.45rem] border-0 bg-[#f2f3f7] p-0 text-[#0f172a] max-md:flex"
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
