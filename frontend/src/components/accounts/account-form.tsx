import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccountType } from '../../types/account';
import { usePrivacyMode } from '../../lib/privacy-mode';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export type AccountFormValues = {
  bankName: string;
  accountNumber: string;
  accountType: AccountType;
  balance: string;
};

type AccountFormProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  values: AccountFormValues;
  validationError: string;
  accountTypeFilter?: AccountType;
  accountNumberLabel?: string;
  onValuesChange: (values: AccountFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function isAccountType(value: string): value is AccountType {
  return value === 'checking' || value === 'savings' || value === 'fixed_income';
}

export function AccountForm({
  isOpen,
  isEditing,
  isSaving,
  values,
  validationError,
  accountTypeFilter,
  accountNumberLabel,
  onValuesChange,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const { t } = useTranslation();
  const { privateMode } = usePrivacyMode();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onCancel(); }}>
      <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[480px]">
        <DialogHeader className="px-[1.4rem] pb-[0.8rem] pr-12 pt-5">
          <DialogTitle>{t(accountTypeFilter ? (isEditing ? 'rendaFixa.edit' : 'rendaFixa.add') : (isEditing ? 'accounts.edit' : 'accounts.add'))}</DialogTitle>
          <DialogDescription>{t(accountTypeFilter ? 'rendaFixa.formDescription' : 'accounts.formDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[1.4rem] pb-[1.4rem] pt-3">
          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="account-bank-name">{t('accounts.bankName')}</Label>
            <Input
              id="account-bank-name"
              value={values.bankName}
              onChange={(event) => onValuesChange({ ...values, bankName: event.target.value })}
              disabled={isSaving}
              maxLength={100}
              autoComplete="organization"
              required
            />
          </div>

          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="account-number">{t(accountNumberLabel ?? 'accounts.accountNumber')}</Label>
            <Input
              id="account-number"
              value={values.accountNumber}
              onChange={(event) => onValuesChange({ ...values, accountNumber: event.target.value })}
              disabled={isSaving}
              maxLength={100}
              required
            />
          </div>

          {accountTypeFilter === 'fixed_income' ? null : accountTypeFilter ? (
            <div className="flex flex-col gap-[0.45rem]">
              <Label>{t('accounts.accountType')}</Label>
              <p className="m-0 rounded-md border border-input bg-muted/20 px-3 py-2 text-sm text-foreground">
                {t(`accounts.types.${accountTypeFilter}`)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-[0.45rem]">
              <Label htmlFor="account-type">{t('accounts.accountType')}</Label>
              <Select
                value={values.accountType}
                onValueChange={(value) => {
                  if (isAccountType(value)) onValuesChange({ ...values, accountType: value });
                }}
                disabled={isSaving}
              >
                <SelectTrigger id="account-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">{t('accounts.types.checking')}</SelectItem>
                  <SelectItem value="savings">{t('accounts.types.savings')}</SelectItem>
                  <SelectItem value="fixed_income">{t('accounts.types.fixedIncome')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="account-balance">{t('accounts.balance')}</Label>
            <Input
              id="account-balance"
              type={privateMode ? 'password' : 'number'}
              step={privateMode ? undefined : '0.01'}
              inputMode="decimal"
              value={values.balance}
              onChange={(event) => onValuesChange({ ...values, balance: event.target.value })}
              disabled={isSaving}
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
