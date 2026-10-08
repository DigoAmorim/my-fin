import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AccountForm, type AccountFormValues } from '../components/accounts/account-form';
import { BankLogo } from '../components/open-finance/bank-logo';
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
  createManualAccount,
  deleteAccount,
  updateManualAccount,
} from '../lib/account-api';
import { deleteInvestment, getInvestmentSummary } from '../lib/investment-api';
import { useCurrencyFormatter } from '../lib/privacy-mode';
import type { Account, ManualAccountInput } from '../types/account';
import type { InvestmentSummary, Investment } from '../types/investment';

type FixedIncomePageProps = {
  onNavigate: (page: AppPage) => void;
};

const EMPTY_MANUAL_POSITION: AccountFormValues = {
  bankName: '',
  accountNumber: '',
  accountType: 'fixed_income',
  balance: '',
};

export function FixedIncomePage({ onNavigate }: FixedIncomePageProps) {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadId, setReloadId] = useState(0);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Account | null>(null);
  const [formValues, setFormValues] = useState(EMPTY_MANUAL_POSITION);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getInvestmentSummary(controller.signal)
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
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  const total = Number(summary?.total ?? 0);

  function reloadInvestments() {
    setIsLoading(true);
    setLoadError('');
    setReloadId((current) => current + 1);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingPosition(null);
    setFormValues(EMPTY_MANUAL_POSITION);
    setFormError('');
  }

  function openCreateForm() {
    setEditingPosition(null);
    setFormValues(EMPTY_MANUAL_POSITION);
    setFormError('');
    setFormOpen(true);
  }

  function openEditForm(position: Investment) {
    if (position.source !== 'manual') return;
    setEditingPosition({
      id: position.id,
      bankId: position.bankId,
      bankName: position.bankName,
      accountNumber: position.subtype,
      accountType: 'fixed_income',
      balance: position.amount,
      updatedAt: position.updatedAt,
      source: 'manual',
    });
    setFormValues({
      bankName: position.bankName,
      accountNumber: position.subtype,
      accountType: 'fixed_income',
      balance: position.amount,
    });
    setFormError('');
    setFormOpen(true);
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: ManualAccountInput = {
      ...formValues,
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      setFormError('');
      if (editingPosition) {
        await updateManualAccount(editingPosition.id, input);
        toast.success(t('rendaFixa.updated'));
      } else {
        await createManualAccount(input);
        toast.success(t('rendaFixa.created'));
      }
      closeForm();
      reloadInvestments();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteInvestment() {
    if (!deletingInvestment) return;
    try {
      setIsDeleting(true);
      if (deletingInvestment.source === 'manual') {
        await deleteAccount(deletingInvestment.id);
      } else {
        await deleteInvestment(deletingInvestment.id);
      }
      setDeletingInvestment(null);
      reloadInvestments();
      toast.success(t('rendaFixa.deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppLayout currentPage="fixedIncome" onNavigate={onNavigate}>
      <PageContainer>
        <PageHeader
          section={t('nav.investiment')}
          title={t('rendaFixa.title')}
          action={(
            <Button size="small" onClick={openCreateForm}>
              <Plus size={15} />
              {t('rendaFixa.add')}
            </Button>
          )}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">
              {t('rendaFixa.listTitle')}
            </h2>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">
              {t('rendaFixa.description')}
            </p>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="m-0 text-sm text-destructive" role="alert">{loadError}</p>
              <Button variant="outline" size="small" onClick={reloadInvestments}>
                {t('rendaFixa.retry')}
              </Button>
            </div>
          ) : isLoading ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">{t('common.loading')}</p>
          ) : summary && summary.investments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <Wallet size={28} className="text-muted-foreground" />
              <p className="m-0 text-sm text-muted-foreground">{t('rendaFixa.empty')}</p>
              <Button size="small" onClick={openCreateForm}>
                <Plus size={15} />
                {t('rendaFixa.add')}
              </Button>
            </div>
          ) : summary ? (
            <div>
              <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <span className="text-xs font-medium text-muted-foreground">{t('rendaFixa.total')}</span>
                <span className="flex items-center gap-2 text-sm font-bold tabular-nums text-emerald-600">
                  {currencyFormatter.format(total)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium sm:px-5">{t('rendaFixa.bank')}</th>
                      <th className="px-4 py-3 font-medium sm:px-5">{t('rendaFixa.subtype')}</th>
                      <th className="px-4 py-3 text-right font-medium sm:px-5">{t('rendaFixa.amount')}</th>
                      <th className="px-4 py-3 font-medium sm:px-5">{t('rendaFixa.updatedAt')}</th>
                      <th className="w-[100px] px-4 py-3 text-right font-medium sm:px-5">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.investments.map((investment) => (
                      <tr key={investment.id} className="text-foreground transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 sm:px-5">
                          <span className="flex items-center gap-2">
                            <BankLogo bankName={investment.bankName} />
                            <span>{investment.bankName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          {t(`rendaFixa.subtypes.${investment.subtype}`, { defaultValue: investment.subtype })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600 sm:px-5">
                          {currencyFormatter.format(Number(investment.amount))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                          {dateFormatter.format(new Date(investment.updatedAt))} {t('common.at')}{' '}
                          {timeFormatter.format(new Date(investment.updatedAt))}
                        </td>
                        <td className="w-[100px] px-4 py-3 text-right sm:px-5">
                          <div className="flex w-full justify-end gap-1">
                            {investment.source === 'manual' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t('common.edit')}
                                title={t('common.edit')}
                                onClick={() => openEditForm(investment)}
                              >
                                <Pencil size={16} />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('common.delete')}
                              title={t('common.delete')}
                              onClick={() => setDeletingInvestment(investment)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
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

      <AccountForm
        isOpen={formOpen}
        isEditing={editingPosition !== null}
        isSaving={isSaving}
        values={formValues}
        validationError={formError}
        accountTypeFilter="fixed_income"
        accountNumberLabel="rendaFixa.applicationType"
        onValuesChange={setFormValues}
        onSubmit={handleFormSubmit}
        onCancel={closeForm}
      />

      <Dialog
        open={deletingInvestment !== null}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeletingInvestment(null); }}
      >
        <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[420px]">
          <DialogHeader className="px-[1.4rem] pb-3 pr-12 pt-5">
            <DialogTitle>{t('rendaFixa.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deletingInvestment
                ? t('rendaFixa.deleteConfirm', {
                  name: deletingInvestment.subtype,
                  bank: deletingInvestment.bankName,
                })
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
