import { useTranslation } from 'react-i18next';
import { purchaseTypeLabelKeys } from '../../lib/transaction-labels';
import type { PurchaseType } from '../../types/transaction';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type PurchaseLimitFormProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  purchaseType: PurchaseType | '';
  availableTypes: PurchaseType[];
  amount: string;
  validationError: string;
  onPurchaseTypeChange: (value: PurchaseType) => void;
  onAmountChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function isPurchaseType(value: string): value is PurchaseType {
  return value === 'first_fortnight'
    || value === 'second_fortnight'
    || value === 'recurring'
    || value === 'installment_plan';
}

export function PurchaseLimitForm({
  isOpen,
  isEditing,
  isSaving,
  purchaseType,
  availableTypes,
  amount,
  validationError,
  onPurchaseTypeChange,
  onAmountChange,
  onSubmit,
  onCancel,
}: PurchaseLimitFormProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onCancel(); }}>
      <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[440px]">
        <DialogHeader className="px-[1.4rem] pb-[0.8rem] pr-12 pt-5">
          <DialogTitle>{t(isEditing ? 'purchaseLimits.edit' : 'purchaseLimits.add')}</DialogTitle>
          <DialogDescription>{t('purchaseLimits.formDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[1.4rem] pb-[1.4rem] pt-3">
          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="purchase-limit-type">{t('purchaseLimits.name')}</Label>
            <Select
              value={purchaseType}
              onValueChange={(value) => {
                if (isPurchaseType(value) && availableTypes.includes(value)) {
                  onPurchaseTypeChange(value);
                }
              }}
            >
              <SelectTrigger id="purchase-limit-type" disabled={isSaving}>
                <SelectValue placeholder={t('purchaseLimits.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>{t(purchaseTypeLabelKeys[type])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="purchase-limit-amount">{t('purchaseLimits.amount')}</Label>
            <Input
              id="purchase-limit-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          {validationError ? <p className="m-0 text-[0.8rem] text-destructive" role="alert">{validationError}</p> : null}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving || !purchaseType}>
              {isSaving ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
