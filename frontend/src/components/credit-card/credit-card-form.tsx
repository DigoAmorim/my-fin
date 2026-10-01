import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { CreditCardForm as CreditCardFormType } from '../../types/credit-card';

type CreditCardFormProps = {
  isOpen: boolean;
  form: CreditCardFormType;
  isEditing: boolean;
  isSaving: boolean;
  validationError: string;
  onChange: (nextForm: CreditCardFormType) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function CreditCardForm({
  isOpen,
  form,
  isEditing,
  isSaving,
  validationError,
  onChange,
  onSubmit,
  onCancel,
}: CreditCardFormProps) {
  const { t } = useTranslation();

  // Formulário controlado: valores e ações pertencem à página que o utiliza.
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onCancel(); }}>
      <DialogContent className="gap-0 rounded-xl p-0 shadow-xl sm:max-w-[440px]">
        <DialogHeader className="px-[1.4rem] pb-[0.8rem] pr-12 pt-5">
          <div>
            <DialogTitle>
              {isEditing ? t('creditCards.edit') : t('creditCards.new')}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 px-[1.4rem] pb-[1.4rem] pt-3">
          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="credit-card-name">{t('creditCards.form.name')}</Label>
            <Input
              id="credit-card-name"
              type="text"
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Banco do Brasil"
              disabled={isSaving}
              required
            />
          </div>

          <div className="flex flex-col gap-[0.45rem]">
            <Label htmlFor="credit-card-due-day">{t('creditCards.form.dueDay')}</Label>
            <Input
              id="credit-card-due-day"
              type="number"
              min={1}
              max={31}
              value={form.dueDay}
              onChange={(event) => onChange({ ...form, dueDay: Number(event.target.value) })}
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
