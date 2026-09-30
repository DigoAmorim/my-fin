import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCardForm } from '../components/credit-card/credit-card-form';
import { CreditCardTable } from '../components/credit-card/credit-card-table';
import { AppLayout } from '../components/layout/app-layout';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { createCreditCard, deleteCreditCard, listCreditCards, updateCreditCard } from '../lib/credit-card-api';
import type { CreditCard, CreditCardForm as CreditCardFormType } from '../types/credit-card';

const emptyForm: CreditCardFormType = { name: '', dueDay: 1 };

export function CreditCardsPage() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [form, setForm] = useState<CreditCardFormType>(emptyForm);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const isEditing = editingCardId !== null;

  const filteredCards = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return cards;

    return cards.filter((card) => card.name.toLowerCase().includes(query));
  }, [cards, searchText]);

  useEffect(() => {
    let isMounted = true;

    void listCreditCards()
      .then((nextCards) => {
        if (isMounted) setCards(nextCards);
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setErrorMessage(loadError instanceof Error ? loadError.message : 'Unexpected error.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingCardId(null);
    setErrorMessage('');
    setIsFormOpen(false);
  }

  function handleNew() {
    resetForm();
    setIsFormOpen(true);
  }

  function toggleLanguage() {
    void i18n.changeLanguage(i18n.language === 'pt-BR' ? 'en' : 'pt-BR');
  }

  function handleEdit(card: CreditCard) {
    setForm({ name: card.name, dueDay: card.dueDay });
    setEditingCardId(card.id);
    setErrorMessage('');
    setIsFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedName = form.name.trim();
    const dueDay = Number(form.dueDay);

    if (!cleanedName || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setErrorMessage(
        !cleanedName ? t('creditCards.errorRequired') : t('creditCards.errorInvalidDueDay'),
      );
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const payload = { name: cleanedName, dueDay };
      const saved = editingCardId !== null
        ? await updateCreditCard(editingCardId, payload)
        : await createCreditCard(payload);

      setCards((currentCards) => {
        if (editingCardId !== null) {
          return currentCards.map((card) => (card.id === saved.id ? saved : card));
        }

        return [...currentCards, saved];
      });

      resetForm();
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : 'Unexpected error.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(card: CreditCard) {
    const confirmed = window.confirm(t('creditCards.deleteConfirm'));
    if (!confirmed) return;

    try {
      await deleteCreditCard(card.id);
      setCards((currentCards) => currentCards.filter((item) => item.id !== card.id));
      if (editingCardId === card.id) resetForm();
    } catch (deleteError) {
      setErrorMessage(deleteError instanceof Error ? deleteError.message : 'Delete failed.');
    }
  }

  return (
    <AppLayout
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((current) => !current)}
      onToggleLanguage={toggleLanguage}
    >
      <div className="mx-auto flex w-[min(1080px,calc(100%-48px))] flex-col gap-[1.2rem] pb-10 pt-[3.4rem] max-md:w-[calc(100%-32px)] max-md:gap-4 max-md:pb-8 max-md:pt-4">
        <PageHeader section={t('nav.creditCards')} title={t('creditCards.title')} />

        <section className="min-w-0 overflow-hidden rounded-xl border border-[#e5e8ed] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.07),0_2px_6px_rgba(15,23,42,0.025)]">
          <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#e9edf2] px-4 py-3 max-md:flex-col max-md:items-start max-md:gap-3 max-md:px-[0.9rem] max-md:py-[0.85rem]">
            <h2 className="m-0 text-[0.86rem] font-semibold text-[#1d2939]">{t('creditCards.listTitle')}</h2>
            <div className="flex items-center gap-[0.6rem] max-md:w-full">
              <label className="flex w-[210px] items-center gap-2 rounded-md border border-[#e3e7ed] bg-white pl-[0.65rem] text-[#8b95a5] max-md:min-w-0 max-md:w-auto max-md:flex-1">
                <Search size={15} aria-hidden="true" />
                <Input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder={t('common.search')}
                  aria-label={t('common.search')}
                  className="h-8 border-0 py-0 pl-0 text-[0.76rem] shadow-none focus-visible:ring-0"
                />
              </label>
              <Button size="small" onClick={handleNew}>
                <Plus size={15} />
                {t('creditCards.new')}
              </Button>
            </div>
          </div>

          {errorMessage && !isFormOpen ? <p className="m-0 border-b border-rose-200 bg-rose-50 px-4 py-3 text-[0.8rem] text-rose-700" role="alert">{errorMessage}</p> : null}

          <CreditCardTable
            cards={filteredCards}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>
      </div>

      <CreditCardForm
        isOpen={isFormOpen}
        form={form}
        isEditing={isEditing}
        isSaving={isSaving}
        errorMessage={errorMessage}
        onChange={setForm}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />
    </AppLayout>
  );
}
