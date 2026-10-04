import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { OpenFinanceBankInput } from '../../types/open-finance';
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

type OpenFinanceBankFormProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  values: OpenFinanceBankInput;
  validationError: string;
  onValuesChange: (values: OpenFinanceBankInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const OPTIONS = [
  ['checkingAccount', 'openFinance.options.checkingAccount'],
  ['savingsAccount', 'openFinance.options.savingsAccount'],
  ['fixedIncome', 'openFinance.options.fixedIncome'],
  ['variableIncome', 'openFinance.options.variableIncome'],
] as const;

export function OpenFinanceBankForm({
  isOpen,
  isEditing,
  isSaving,
  values,
  validationError,
  onValuesChange,
  onSubmit,
  onCancel,
}: OpenFinanceBankFormProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onCancel(); }}>
      <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[480px]">
        <DialogHeader className="px-[1.4rem] pb-[0.8rem] pr-12 pt-5">
          <DialogTitle>{t(isEditing ? 'openFinance.edit' : 'openFinance.add')}</DialogTitle>
          <DialogDescription>{t('openFinance.formDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[1.4rem] pb-[1.4rem] pt-3">
          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="open-finance-bank-name">{t('openFinance.bankName')}</Label>
            <Input
              id="open-finance-bank-name"
              value={values.bankName}
              onChange={(event) => onValuesChange({ ...values, bankName: event.target.value })}
              disabled={isSaving}
              maxLength={100}
              autoComplete="organization"
              required
            />
          </div>

          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-[0.78rem] font-medium text-foreground/80">
              {t('openFinance.accountTypes')}
            </legend>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {OPTIONS.map(([key, labelKey]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={values[key]}
                    onChange={(event) => onValuesChange({ ...values, [key]: event.target.checked })}
                    disabled={isSaving}
                    className="size-4 accent-primary"
                  />
                  {t(labelKey)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="open-finance-item-id">{t('openFinance.pluggyItemId')}</Label>
            <Input
              id="open-finance-item-id"
              value={values.pluggyItemId}
              onChange={(event) => onValuesChange({ ...values, pluggyItemId: event.target.value })}
              disabled={isSaving}
              maxLength={100}
              required
            />
          </div>

          {validationError ? <p className="m-0 text-[0.8rem] text-destructive" role="alert">{validationError}</p> : null}

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
