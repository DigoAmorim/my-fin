import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import type { CreditCard } from '../../types/credit-card';

type CreditCardTableProps = {
  cards: CreditCard[];
  isLoading: boolean;
  onEdit: (card: CreditCard) => void;
  onDelete: (card: CreditCard) => void;
};

export function CreditCardTable({ cards, isLoading, onEdit, onDelete }: CreditCardTableProps) {
  const { t } = useTranslation();

  // A tabela apresenta carregamento, lista vazia ou cartões e delega edição/exclusão à página.
  if (isLoading) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (cards.length === 0) {
    return <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('creditCards.empty')}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('creditCards.table.name')}</TableHead>
          <TableHead className="w-[150px] text-right">{t('creditCards.table.dueDay')}</TableHead>
          <TableHead className="w-[100px] text-right">{t('creditCards.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cards.map((card) => (
          <TableRow key={card.id}>
            <TableCell>{card.name}</TableCell>
            <TableCell className="w-[150px] text-right font-semibold tabular-nums">{card.dueDay}</TableCell>
            <TableCell className="w-[100px] text-right">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => onEdit(card)}
                aria-label={`${t('common.edit')} ${card.name}`}
                title={t('common.edit')}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                onClick={() => onDelete(card)}
                aria-label={`${t('common.delete')} ${card.name}`}
                title={t('common.delete')}
              >
                <Trash2 size={14} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
