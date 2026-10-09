import { Gauge, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppLayout, type AppPage } from '../components/layout/app-layout';
import { PurchaseLimitForm } from '../components/purchase-limit/purchase-limit-form';
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
import { purchaseTypeLabelKeys } from '../lib/transaction-labels';
import {
  createPurchaseLimit,
  deletePurchaseLimit,
  listPurchaseLimits,
  updatePurchaseLimit,
} from '../lib/purchase-limit-api';
import { listTransactions } from '../lib/transaction-api';
import { resolveIntlLocale } from '../lib/locale';
import { minorUnitsToNumber, toMinorUnits } from '../lib/money';
import { useCurrencyFormatter } from '../lib/privacy-mode';
import type { PurchaseLimit, PurchaseLimitInput } from '../types/purchase-limit';
import type { PurchaseType, Transaction } from '../types/transaction';

const PURCHASE_TYPES: PurchaseType[] = [
  'first_fortnight',
  'second_fortnight',
  'recurring',
  'installment_plan',
];

type PurchaseLimitsPageProps = {
  onNavigate: (page: AppPage) => void;
};

export function PurchaseLimitsPage({ onNavigate }: PurchaseLimitsPageProps) {
  const { t, i18n } = useTranslation();
  const [limits, setLimits] = useState<PurchaseLimit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<PurchaseLimit | null>(null);
  const [deletingLimit, setDeletingLimit] = useState<PurchaseLimit | null>(null);
  const [purchaseType, setPurchaseType] = useState<PurchaseType | ''>('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const locale = resolveIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const currencyFormatter = useCurrencyFormatter(locale);
  const spentByType = useMemo(() => {
    const totals = new Map<PurchaseType, bigint>(PURCHASE_TYPES.map((type) => [type, 0n]));
    for (const transaction of transactions) {
      const value = toMinorUnits(transaction.installmentAmount);
      const direction = transaction.transactionType === 'credit' ? -1 : 1;
      totals.set(transaction.purchaseType, (totals.get(transaction.purchaseType) ?? 0n) + BigInt(direction) * value);
    }
    return totals;
  }, [transactions]);
  const availableTypes = PURCHASE_TYPES.filter(
    (type) => type === editingLimit?.purchaseType || !limits.some((limit) => limit.purchaseType === type),
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      listPurchaseLimits(controller.signal),
      listTransactions(controller.signal),
    ])
      .then(([nextLimits, nextTransactions]) => {
        if (controller.signal.aborted) return;
        setLimits(nextLimits);
        setTransactions(nextTransactions);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : t('common.error'));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [t]);

  function resetForm() {
    setDialogOpen(false);
    setEditingLimit(null);
    setPurchaseType('');
    setAmount('');
    setFormError('');
  }

  function openCreateDialog() {
    setEditingLimit(null);
    setPurchaseType(availableTypes[0] ?? '');
    setAmount('');
    setFormError('');
    setDialogOpen(true);
  }

  function openEditDialog(limit: PurchaseLimit) {
    setEditingLimit(limit);
    setPurchaseType(limit.purchaseType);
    setAmount(limit.amount);
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAmount = amount.trim().replace(',', '.');
    const parsedAmount = Number(normalizedAmount);
    if (!purchaseType) {
      setFormError(t('purchaseLimits.validationType'));
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError(t('purchaseLimits.validationAmount'));
      return;
    }

    const payload: PurchaseLimitInput = { purchaseType, amount: normalizedAmount };
    try {
      setIsSaving(true);
      setFormError('');
      const saved = editingLimit
        ? await updatePurchaseLimit(editingLimit.id, payload)
        : await createPurchaseLimit(payload);
      setLimits((current) => (
        editingLimit
          ? current.map((limit) => limit.id === saved.id ? saved : limit)
          : [...current, saved]
      ));
      toast.success(t(editingLimit ? 'purchaseLimits.updated' : 'purchaseLimits.created'));
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingLimit) return;
    try {
      setIsDeleting(true);
      await deletePurchaseLimit(deletingLimit.id);
      setLimits((current) => current.filter((limit) => limit.id !== deletingLimit.id));
      setDeletingLimit(null);
      toast.success(t('purchaseLimits.deleted'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppLayout
      currentPage="limits"
      onNavigate={onNavigate}
    >
      <PageContainer>
        <PageHeader
          section={t('nav.limits')}
          title={t('purchaseLimits.title')}
          action={(
            <Button size="small" onClick={openCreateDialog} disabled={availableTypes.length === 0}>
              <Plus size={15} />
              {t('purchaseLimits.add')}
            </Button>
          )}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('purchaseLimits.listTitle')}</h2>
            <p className="mb-0 mt-1 text-xs text-muted-foreground">{t('purchaseLimits.description')}</p>
          </div>

          {loadError ? (
            <p className="m-0 px-4 py-8 text-center text-sm text-destructive" role="alert">{loadError}</p>
          ) : isLoading ? (
            <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground" role="status">{t('common.loading')}</p>
          ) : limits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <Gauge size={28} className="text-muted-foreground" />
              <p className="m-0 text-sm text-muted-foreground">{t('purchaseLimits.empty')}</p>
              <Button size="small" onClick={openCreateDialog}>
                <Plus size={15} />
                {t('purchaseLimits.add')}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {limits.map((limit) => {
                const spent = spentByType.get(limit.purchaseType) ?? 0n;
                const target = toMinorUnits(limit.amount);
                const percentage = target > 0n
                  ? Math.max(0, (Number(spent) / Number(target)) * 100)
                  : 0;
                const fillColor = percentage >= 100
                  ? 'bg-rose-500'
                  : percentage >= 80
                    ? 'bg-amber-400'
                    : 'bg-emerald-500';
                const typeName = t(purchaseTypeLabelKeys[limit.purchaseType]);
                return (
                  <article key={limit.id} className="px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5">
                    <div className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Gauge size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="m-0 truncate text-sm font-semibold text-foreground">{typeName}</h3>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <div
                          className="mb-2 h-2 overflow-hidden rounded-full bg-muted/70"
                          role="progressbar"
                          aria-label={t('purchaseLimits.progressLabel', { name: typeName })}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.min(Math.round(percentage), 100)}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${fillColor}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="m-0 text-xs tabular-nums text-muted-foreground">
                          {currencyFormatter.format(minorUnitsToNumber(spent))}
                          <span className="px-1">/</span>
                          {currencyFormatter.format(minorUnitsToNumber(target))}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`${t('common.edit')} ${typeName}`}
                          onClick={() => openEditDialog(limit)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                          aria-label={`${t('common.delete')} ${typeName}`}
                          onClick={() => setDeletingLimit(limit)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ContentSection>
      </PageContainer>

      <PurchaseLimitForm
        isOpen={dialogOpen}
        isEditing={editingLimit !== null}
        isSaving={isSaving}
        purchaseType={purchaseType}
        availableTypes={availableTypes}
        amount={amount}
        validationError={formError}
        onPurchaseTypeChange={setPurchaseType}
        onAmountChange={setAmount}
        onSubmit={(event) => { void handleSubmit(event); }}
        onCancel={resetForm}
      />

      <Dialog open={Boolean(deletingLimit)} onOpenChange={(open) => { if (!open) setDeletingLimit(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('purchaseLimits.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('purchaseLimits.deleteConfirm', {
                name: deletingLimit ? t(purchaseTypeLabelKeys[deletingLimit.purchaseType]) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLimit(null)} disabled={isDeleting}>
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
