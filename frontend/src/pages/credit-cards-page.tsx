import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CreditCardForm } from '../components/credit-card/credit-card-form';
import { CreditCardTable } from '../components/credit-card/credit-card-table';
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
import { createCreditCard, deleteCreditCard, listCreditCards, updateCreditCard } from '../lib/credit-card-api';
import type { CreditCard, CreditCardForm as CreditCardFormType } from '../types/credit-card';

const emptyForm: CreditCardFormType = { name: '', dueDay: 1 };

type CreditCardsPageProps = {
  onNavigate: (page: AppPage) => void;
};

export function CreditCardsPage({ onNavigate }: CreditCardsPageProps) {
  const { t } = useTranslation();
  // A página mantém os dados e controla os diálogos; os componentes filhos recebem estado e callbacks.
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [deletingCard, setDeletingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CreditCardFormType>(emptyForm);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const isEditing = editingCardId !== null;

  useEffect(() => {
    const controller = new AbortController();

    void listCreditCards(controller.signal)
      .then((nextCards) => {
        if (controller.signal.aborted) return;
        setCards(nextCards);
        setIsLoading(false);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setLoadErrorMessage(loadError instanceof Error ? loadError.message : 'Unexpected error.');
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingCardId(null);
    setFormErrorMessage('');
    setIsFormOpen(false);
  }

  function handleNew() {
    resetForm();
    setIsFormOpen(true);
  }

  function handleEdit(card: CreditCard) {
    setForm({ name: card.name, dueDay: card.dueDay });
    setEditingCardId(card.id);
    setFormErrorMessage('');
    setIsFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Valida os dados antes de escolher entre criar um novo cartão ou atualizar o existente.
    const cleanedName = form.name.trim();
    const dueDay = Number(form.dueDay);

    if (!cleanedName || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setFormErrorMessage(
        !cleanedName ? t('creditCards.errorRequired') : t('creditCards.errorInvalidDueDay'),
      );
      return;
    }

    try {
      setIsSaving(true);
      setFormErrorMessage('');

      const wasEditing = editingCardId !== null;
      const payload = { name: cleanedName, dueDay };
      const saved = wasEditing
        ? await updateCreditCard(editingCardId, payload)
        : await createCreditCard(payload);

      setCards((currentCards) => {
        if (wasEditing) {
          return currentCards.map((card) => (card.id === saved.id ? saved : card));
        }

        return [...currentCards, saved];
      });

      resetForm();
      toast.success(t(wasEditing ? 'creditCards.successUpdate' : 'creditCards.successCreate'));
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete(card: CreditCard) {
    setDeletingCard(card);
  }

  async function confirmDelete() {
    if (!deletingCard) return;

    try {
      setIsDeleting(true);
      await deleteCreditCard(deletingCard.id);
      // Só remove da tela depois que o servidor confirmar a exclusão.
      setCards((currentCards) => currentCards.filter((item) => item.id !== deletingCard.id));
      if (editingCardId === deletingCard.id) resetForm();
      setDeletingCard(null);
      toast.success(t('creditCards.successDelete'));
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppLayout
      currentPage="creditCards"
      onNavigate={onNavigate}
    >
      <PageContainer>
        <PageHeader
          section={t('nav.creditCards')}
          title={t('creditCards.title')}
          action={(
            <Button size="small" onClick={handleNew}>
              <Plus size={15} />
              {t('creditCards.new')}
            </Button>
          )}
        />

        <ContentSection>
          <div className="border-b border-border px-4 py-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-foreground">{t('creditCards.listTitle')}</h2>
          </div>

          {loadErrorMessage ? <p className="m-0 border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-[0.8rem] text-destructive" role="alert">{loadErrorMessage}</p> : null}

          <CreditCardTable
            cards={cards}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </ContentSection>
      </PageContainer>

      <CreditCardForm
        isOpen={isFormOpen}
        form={form}
        isEditing={isEditing}
        isSaving={isSaving}
        validationError={formErrorMessage}
        onChange={setForm}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />

      <Dialog
        open={deletingCard !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeletingCard(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete')}</DialogTitle>
            <DialogDescription>
              {t('creditCards.deleteConfirm', { name: deletingCard?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCard(null)}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
