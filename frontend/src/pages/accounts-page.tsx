import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AccountForm } from '../components/account/account-form';
import { AccountTable } from '../components/account/account-table';
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
  createAccount,
  deleteAccount,
  listAccounts,
  refreshAccounts as refreshAccountsFromApi,
  updateAccount,
} from '../lib/account-api';
import { createCurrencyFormatter } from '../lib/utils';
import type { Account, AccountInput } from '../types/account';

const EMPTY_FORM: AccountInput = {
  name: '',
  bankName: '',
  pluggyItemId: null,
  currentBalance: '0.00',
};

type AccountsPageProps = {
  onNavigate: (page: AppPage) => void;
};

function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((left, right) => left.name.localeCompare(right.name));
}

export function AccountsPage({ onNavigate }: AccountsPageProps) {
  const { t, i18n } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [form, setForm] = useState<AccountInput>(EMPTY_FORM);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith('pt') ? 'pt-BR' : 'en-US';
  const currencyFormatter = useMemo(() => createCurrencyFormatter(locale), [locale]);

  useEffect(() => {
    const controller = new AbortController();

    void listAccounts(controller.signal)
      .then((loadedAccounts) => {
        if (controller.signal.aborted) return;
        setAccounts(sortAccounts(loadedAccounts));
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
    setIsFormOpen(false);
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setValidationError('');
  }

  function openCreateForm() {
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setValidationError('');
    setIsFormOpen(true);
  }

  function openEditForm(account: Account) {
    setEditingAccount(account);
    setForm({
      name: account.name,
      bankName: account.bankName,
      pluggyItemId: account.pluggyItemId,
      currentBalance: account.currentBalance,
    });
    setValidationError('');
    setIsFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSaving(true);
      setValidationError('');
      const savedAccount = editingAccount
        ? await updateAccount(editingAccount.id, form)
        : await createAccount(form);

      setAccounts((current) => sortAccounts(
        editingAccount
          ? current.map((account) => account.id === savedAccount.id ? savedAccount : account)
          : [...current, savedAccount],
      ));
      toast.success(t(editingAccount ? 'accounts.successUpdate' : 'accounts.successCreate'));
      closeForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      setValidationError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingAccount) return;
    try {
      setIsDeleting(true);
      await deleteAccount(deletingAccount.id);
      setAccounts((current) => current.filter((account) => account.id !== deletingAccount.id));
      toast.success(t('accounts.successDelete'));
      setDeletingAccount(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRefreshAccounts() {
    try {
      setIsRefreshing(true);
      const result = await refreshAccountsFromApi();
      setAccounts((current) => sortAccounts(
        current.map((account) => (
          result.updatedAccounts.find((updated) => updated.id === account.id) ?? account
        )),
      ));

      const summary = t('accounts.refreshSummary', result);
      if (result.failedCount > 0) {
        toast.warning(summary, {
          description: t('accounts.refreshFailedAccounts', {
            accounts: result.failedAccounts.join(', '),
          }),
        });
      } else if (result.updatedCount === 0) {
        toast.info(t('accounts.refreshNoApplicableAccounts', { skipped: result.skippedCount }));
      } else {
        toast.success(summary);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <AppLayout currentPage="accounts" onNavigate={onNavigate}>
      <PageContainer>
        <PageHeader
          section={t('nav.accounts')}
          title={t('accounts.title')}
          action={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="small"
                variant="outline"
                onClick={() => void handleRefreshAccounts()}
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : undefined} />
                {isRefreshing ? t('accounts.refreshing') : t('accounts.refresh')}
              </Button>
              <Button size="small" onClick={openCreateForm}>
                <Plus size={15} />
                {t('accounts.new')}
              </Button>
            </div>
          )}
        />

        <ContentSection>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 max-md:px-[0.9rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('accounts.listTitle')}</h2>
          </div>

          {loadError ? (
            <p className="m-0 border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : (
            <AccountTable
              accounts={accounts}
              isLoading={isLoading}
              locale={locale}
              formatCurrency={(amount) => currencyFormatter.format(amount)}
              onEdit={openEditForm}
              onDelete={setDeletingAccount}
            />
          )}
        </ContentSection>
      </PageContainer>

      <AccountForm
        open={isFormOpen}
        form={form}
        isEditing={editingAccount !== null}
        isSaving={isSaving}
        validationError={validationError}
        onChange={setForm}
        onSubmit={handleSubmit}
        onCancel={closeForm}
      />

      <Dialog
        open={deletingAccount !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingAccount(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')}</DialogTitle>
            <DialogDescription>
              {t('accounts.deleteConfirm', { name: deletingAccount?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAccount(null)} disabled={isDeleting}>
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
