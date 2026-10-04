import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { AccountInput } from '../../types/account';

type AccountFormProps = {
  open: boolean;
  form: AccountInput;
  isEditing: boolean;
  isSaving: boolean;
  validationError: string;
  onChange: (nextForm: AccountInput) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function AccountForm({
  open,
  form,
  isEditing,
  isSaving,
  validationError,
  onChange,
  onSubmit,
  onCancel,
}: AccountFormProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isSaving) onCancel(); }}>
      <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[480px]">
        <DialogHeader className="px-6 pb-3 pr-12 pt-5">
          <DialogTitle>{t(isEditing ? 'accounts.edit' : 'accounts.new')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-6 pb-6 pt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-name">{t('accounts.form.name')}</Label>
              <Input
                id="account-name"
                value={form.name}
                maxLength={100}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                placeholder={t('accounts.form.namePlaceholder')}
                disabled={isSaving}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-bank-name">{t('accounts.form.bankName')}</Label>
              <Input
                id="account-bank-name"
                value={form.bankName}
                maxLength={100}
                onChange={(event) => onChange({ ...form, bankName: event.target.value })}
                placeholder={t('accounts.form.bankPlaceholder')}
                disabled={isSaving}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account-pluggy-item-id">{t('accounts.form.pluggyItemId')}</Label>
            <Input
              id="account-pluggy-item-id"
              value={form.pluggyItemId ?? ''}
              maxLength={100}
              onChange={(event) => onChange({ ...form, pluggyItemId: event.target.value || null })}
              placeholder={t('accounts.form.pluggyItemIdPlaceholder')}
              disabled={isSaving}
            />
            <p className="m-0 text-xs text-muted-foreground">{t('accounts.form.pluggyHelp')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account-current-balance">{t('accounts.form.currentBalance')}</Label>
            <Input
              id="account-current-balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.currentBalance}
              onChange={(event) => onChange({ ...form, currentBalance: event.target.value })}
              disabled={isSaving}
              required
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
