import { useTranslation } from 'react-i18next';
import type { CreditCard } from '../../types/credit-card';
import type { PurchaseType, TransactionFormValues, TransactionType } from '../../types/transaction';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DatePickerInput } from '../ui/date-picker-input';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type TransactionFormProps = {
  open: boolean;
  cards: CreditCard[];
  form: TransactionFormValues;
  isEditing: boolean;
  isSaving: boolean;
  validationError: string;
  onChange: (form: TransactionFormValues) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function TransactionForm({
  open,
  cards,
  form,
  isEditing,
  isSaving,
  validationError,
  onChange,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const isCredit = form.transactionType === 'credit';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isSaving) onCancel(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-xl p-0 shadow-xl sm:max-w-[560px]">
        <DialogHeader className="px-6 pb-3 pr-12 pt-6">
          <DialogTitle>{t(isEditing ? 'transactions.edit' : 'transactions.new')}</DialogTitle>
          <DialogDescription>{t('transactions.formDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-6 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor="transaction-card">{t('transactions.fields.card')}</Label>
            <Select
              value={form.creditCardId}
              onValueChange={(creditCardId) => onChange({ ...form, creditCardId })}
              disabled={isSaving}
              required
            >
              <SelectTrigger id="transaction-card" className="w-full">
                <SelectValue placeholder={t('transactions.selectCard')} />
              </SelectTrigger>
              <SelectContent>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={String(card.id)}>{card.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="transaction-type">{t('transactions.fields.type')}</Label>
              <Select
                value={form.transactionType}
                onValueChange={(transactionType) => onChange({ ...form, transactionType: transactionType as TransactionType })}
                disabled={isSaving}
                required
              >
                <SelectTrigger id="transaction-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main_card">{t('transactions.types.mainCard')}</SelectItem>
                  <SelectItem value="purchase">{t('transactions.types.purchase')}</SelectItem>
                  <SelectItem value="credit">{t('transactions.types.credit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase-type">{t('transactions.fields.purchase')}</Label>
              <Select
                value={form.purchaseType}
                onValueChange={(value) => {
                  // Tipos de quinzena e recorrente fixam uma parcela; parcelamento aceita qualquer quantidade positiva.
                  const purchaseType = value as PurchaseType;
                  const totalInstallments = purchaseType === 'installment_plan'
                    ? (Number.isSafeInteger(Number(form.totalInstallments)) && Number(form.totalInstallments) > 0
                      ? form.totalInstallments
                      : '1')
                    : '1';
                  onChange({ ...form, purchaseType, totalInstallments });
                }}
                disabled={isSaving}
                required
              >
                <SelectTrigger id="purchase-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_fortnight">{t('transactions.purchaseTypes.firstFortnight')}</SelectItem>
                  <SelectItem value="second_fortnight">{t('transactions.purchaseTypes.secondFortnight')}</SelectItem>
                  <SelectItem value="recurring">{t('transactions.purchaseTypes.recurring')}</SelectItem>
                  <SelectItem value="installment_plan">{t('transactions.purchaseTypes.installmentPlan')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="transaction-installments">{t('transactions.fields.installments')}</Label>
              <Input
                id="transaction-installments"
                type="number"
                min={1}
                step={1}
                value={form.totalInstallments}
                onChange={(event) => onChange({ ...form, totalInstallments: event.target.value })}
                disabled={isSaving || form.purchaseType !== 'installment_plan'}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transaction-amount">{t('transactions.fields.installmentAmount')}</Label>
              <Input
                id="transaction-amount"
                type="text"
                inputMode="decimal"
                value={form.installmentAmount}
                onChange={(event) => onChange({ ...form, installmentAmount: event.target.value })}
                placeholder="0.00"
                disabled={isSaving}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="transaction-debtor">
                {t('transactions.fields.debtor')}{isCredit ? ' *' : ''}
              </Label>
              <Input
                id="transaction-debtor"
                type="text"
                maxLength={20}
                value={form.debtor}
                onChange={(event) => onChange({ ...form, debtor: event.target.value })}
                disabled={isSaving}
                required={isCredit}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transaction-date">{t('transactions.fields.date')}</Label>
              <DatePickerInput
                id="transaction-date"
                value={form.date}
                onChange={(date) => onChange({ ...form, date })}
                disabled={isSaving}
                className="w-full justify-start"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transaction-description">{t('transactions.fields.description')}</Label>
            <Input
              id="transaction-description"
              type="text"
              maxLength={50}
              value={form.description}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              disabled={isSaving}
            />
          </div>

          {validationError ? <p className="m-0 text-sm text-destructive" role="alert">{validationError}</p> : null}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}