import { ChartNoAxesCombined, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { ContentSection } from '../components/layout/content-section';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  deleteVariableIncomeInvestment,
  getVariableIncomeSummary,
} from '../lib/variable-income-api';
import { useCurrencyFormatter } from '../lib/privacy-mode';
import type { VariableIncomeInvestment, VariableIncomeSummary } from '../types/variable-income';

type VariableIncomePageProps = {
  onNavigate: (page: AppPage) => void;
};

export function VariableIncomePage({ onNavigate }: VariableIncomePageProps) {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<VariableIncomeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadId, setReloadId] = useState(0);
  const [deletingInvestment, setDeletingInvestment] = useState<VariableIncomeInvestment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getVariableIncomeSummary(controller.signal)
      .then((nextSummary) => {
        if (!controller.signal.aborted) setSummary(nextSummary);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : t('common.error'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadId, t]);

  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = language.startsWith('pt') ? 'pt-BR' : 'en-US';
  const currencyFormatter = useCurrencyFormatter(locale);
  const quantityFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 10 });

  function reloadInvestments() {
    setIsLoading(true);
    setLoadError('');
    setReloadId((current) => current + 1);
  }

  async function confirmDeleteInvestment() {
    if (!deletingInvestment) return;
    try {
      setIsDeleting(true);
      await deleteVariableIncomeInvestment(deletingInvestment.id);
      setDeletingInvestment(null);
      reloadInvestments();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppLayout currentPage="variableIncome" onNavigate={onNavigate}>
      <PageContainer>
        <PageHeader
          section={t('nav.investiment')}
          title={t('rendaVariavel.title')}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">
              {t('rendaVariavel.listTitle')}
            </h2>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">
              {t('rendaVariavel.description')}
            </p>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="m-0 text-sm text-destructive" role="alert">{loadError}</p>
              <Button variant="outline" size="small" onClick={reloadInvestments}>
                {t('rendaVariavel.retry')}
              </Button>
            </div>
          ) : isLoading ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">
              {t('common.loading')}
            </p>
          ) : summary && summary.investments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <Wallet size={28} className="text-muted-foreground" />
              <p className="m-0 text-sm text-muted-foreground">{t('rendaVariavel.empty')}</p>
            </div>
          ) : summary ? (
            <div>
              <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <span className="text-xs font-medium text-muted-foreground">{t('rendaVariavel.total')}</span>
                <span className="flex items-center gap-2 text-sm font-bold tabular-nums text-emerald-600">
                  {currencyFormatter.format(Number(summary.total))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium sm:px-5">{t('rendaVariavel.asset')}</th>
                      <th className="px-4 py-3 text-right font-medium sm:px-5">{t('rendaVariavel.unitValue')}</th>
                      <th className="px-4 py-3 text-right font-medium sm:px-5">{t('rendaVariavel.quantity')}</th>
                      <th className="px-4 py-3 text-right font-medium sm:px-5">{t('rendaVariavel.amount')}</th>
                      <th className="w-[72px] px-4 py-3 text-right font-medium sm:px-5">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.investments.map((investment) => (
                      <tr key={investment.id} className="text-foreground transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium sm:px-5">
                          <span className="flex items-center gap-2">
                            <span
                              role="img"
                              aria-label={t('rendaVariavel.assetLogo', { name: investment.assetName })}
                              title={investment.assetName}
                              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
                            >
                              <ChartNoAxesCombined size={19} />
                            </span>
                            <span>{investment.assetName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                          {currencyFormatter.format(Number(investment.unitValue))}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums sm:px-5">
                          {quantityFormatter.format(Number(investment.quantity))}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600 sm:px-5">
                          {currencyFormatter.format(Number(investment.amount))}
                        </td>
                        <td className="w-[72px] px-4 py-3 text-right sm:px-5">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('rendaVariavel.deleteAsset', { name: investment.assetName })}
                            title={t('common.delete')}
                            onClick={() => setDeletingInvestment(investment)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </ContentSection>
      </PageContainer>
      <Dialog
        open={deletingInvestment !== null}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeletingInvestment(null); }}
      >
        <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[420px]">
          <DialogHeader className="px-[1.4rem] pb-3 pr-12 pt-5">
            <DialogTitle>{t('rendaVariavel.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deletingInvestment
                ? t('rendaVariavel.deleteConfirm', { name: deletingInvestment.assetName })
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-[1.4rem] pb-[1.4rem]">
            <Button variant="outline" onClick={() => setDeletingInvestment(null)} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmDeleteInvestment()} disabled={isDeleting}>
              {isDeleting ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
