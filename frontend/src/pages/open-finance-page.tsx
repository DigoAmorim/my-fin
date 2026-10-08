import { Globe, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { BankLogo } from '../components/open-finance/bank-logo';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { ContentSection } from '../components/layout/content-section';
import { PageContainer } from '../components/layout/page-container';
import { PageHeader } from '../components/layout/page-header';
import { OpenFinanceBankForm } from '../components/open-finance/open-finance-bank-form';
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
  createOpenFinanceBank,
  deleteOpenFinanceBank,
  listOpenFinanceBanks,
  synchronizeOpenFinanceAccounts,
  updateOpenFinanceBank,
} from '../lib/open-finance-api';
import type { OpenFinanceBank, OpenFinanceBankInput } from '../types/open-finance';

type OpenFinancePageProps = {
  onNavigate: (page: AppPage) => void;
};

const EMPTY_BANK: OpenFinanceBankInput = {
  bankName: '',
  checkingAccount: false,
  savingsAccount: false,
  fixedIncome: false,
  variableIncome: false,
  pluggyItemId: '',
};

const OPTION_KEYS = [
  ['checkingAccount', 'openFinance.options.checkingAccount'],
  ['savingsAccount', 'openFinance.options.savingsAccount'],
  ['fixedIncome', 'openFinance.options.fixedIncome'],
  ['variableIncome', 'openFinance.options.variableIncome'],
] as const;

export function OpenFinancePage({ onNavigate }: OpenFinancePageProps) {
  const { t } = useTranslation();
  const [banks, setBanks] = useState<OpenFinanceBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<OpenFinanceBank | null>(null);
  const [deletingBank, setDeletingBank] = useState<OpenFinanceBank | null>(null);
  const [values, setValues] = useState<OpenFinanceBankInput>(EMPTY_BANK);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void listOpenFinanceBanks(controller.signal)
      .then((nextBanks) => {
        if (controller.signal.aborted) return;
        setBanks(nextBanks);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : t('common.error'));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [t]);

  function closeForm() {
    setDialogOpen(false);
    setEditingBank(null);
    setValues(EMPTY_BANK);
    setFormError('');
  }

  function openCreateForm() {
    setEditingBank(null);
    setValues(EMPTY_BANK);
    setFormError('');
    setDialogOpen(true);
  }

  function openEditForm(bank: OpenFinanceBank) {
    setEditingBank(bank);
    setValues({
      bankName: bank.bankName,
      checkingAccount: bank.checkingAccount,
      savingsAccount: bank.savingsAccount,
      fixedIncome: bank.fixedIncome,
      variableIncome: bank.variableIncome,
      pluggyItemId: bank.pluggyItemId,
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Object.values(values).some((value) => value === true)) {
      setFormError(t('openFinance.validationOptionRequired'));
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');
      const savedBank = editingBank
        ? await updateOpenFinanceBank(editingBank.id, values)
        : await createOpenFinanceBank(values);
      setBanks((current) => (
        editingBank
          ? current
            .map((bank) => bank.id === savedBank.id ? savedBank : bank)
            .sort((left, right) => left.bankName.localeCompare(right.bankName))
          : [...current, savedBank].sort((left, right) => left.bankName.localeCompare(right.bankName))
      ));
      toast.success(t(editingBank ? 'openFinance.updated' : 'openFinance.created'));
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingBank) return;
    try {
      setIsDeleting(true);
      await deleteOpenFinanceBank(deletingBank.id);
      setBanks((current) => current.filter((bank) => bank.id !== deletingBank.id));
      setDeletingBank(null);
      toast.success(t('openFinance.deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSynchronize() {
    try {
      setIsSynchronizing(true);
      const result = await synchronizeOpenFinanceAccounts();
      toast.success(t('openFinance.syncSuccess', {
        accounts: result.synchronizedAccounts,
        investments: result.synchronizedInvestments,
        variableInvestments: result.synchronizedVariableInvestments,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSynchronizing(false);
    }
  }

  return (
    <AppLayout currentPage="openFinance" onNavigate={onNavigate}>
      <PageContainer>
        <PageHeader
          section={t('nav.limits')}
          title={t('openFinance.title')}
          action={(
            <>
              <Button
                variant="outline"
                size="small"
                onClick={() => void handleSynchronize()}
                disabled={isSynchronizing}
              >
                <RefreshCw size={15} className={isSynchronizing ? 'animate-spin' : undefined} />
                {t(isSynchronizing ? 'openFinance.synchronizing' : 'openFinance.synchronize')}
              </Button>
              <Button size="small" onClick={openCreateForm}>
                <Plus size={15} />
                {t('openFinance.add')}
              </Button>
            </>
          )}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('openFinance.listTitle')}</h2>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">{t('openFinance.description')}</p>
          </div>

          {loadError ? (
            <p className="m-0 px-4 py-8 text-center text-sm text-destructive" role="alert">{loadError}</p>
          ) : isLoading ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">{t('common.loading')}</p>
          ) : banks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <Globe size={28} className="text-muted-foreground" />
              <p className="m-0 text-sm text-muted-foreground">{t('openFinance.empty')}</p>
              <Button size="small" onClick={openCreateForm}>
                <Plus size={15} />
                {t('openFinance.add')}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {banks.map((bank) => (
                <article key={bank.id} className="flex items-center gap-4 px-4 py-3 max-sm:flex-col max-sm:items-start">
                  <BankLogo bankName={bank.bankName} />
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 truncate text-sm font-semibold text-foreground">{bank.bankName}</h3>
                    <ul className="mb-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
                      {OPTION_KEYS.filter(([key]) => bank[key]).map(([, labelKey]) => (
                        <li
                          key={labelKey}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        >
                          {t(labelKey)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                      onClick={() => openEditForm(bank)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      onClick={() => setDeletingBank(bank)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </ContentSection>
      </PageContainer>

      <OpenFinanceBankForm
        isOpen={dialogOpen}
        isEditing={editingBank !== null}
        isSaving={isSaving}
        values={values}
        validationError={formError}
        onValuesChange={setValues}
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />

      <Dialog open={deletingBank !== null} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingBank(null); }}>
        <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[420px]">
          <DialogHeader className="px-[1.4rem] pb-3 pr-12 pt-5">
            <DialogTitle>{t('openFinance.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deletingBank ? t('openFinance.deleteConfirm', { name: deletingBank.bankName }) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-[1.4rem] pb-[1.4rem]">
            <Button variant="outline" onClick={() => setDeletingBank(null)} disabled={isDeleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting ? t('common.loading') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
