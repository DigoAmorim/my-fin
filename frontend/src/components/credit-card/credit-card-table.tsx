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

  return (
    <div>
      <div>
        {isLoading ? (
          <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : cards.length === 0 ? (
          <p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{t('creditCards.empty')}</p>
        ) : (
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
                      className="text-[#718096]"
                      onClick={() => onEdit(card)}
                      aria-label={`${t('common.edit')} ${card.name}`}
                      title={t('common.edit')}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#718096] hover:bg-rose-50 hover:text-[#bd4456]"
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
        )}
      </div>
    </div>
  );
}
