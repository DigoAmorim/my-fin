import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { SortableTableHead } from '../ui/sortable-table-head';
import { sortRows, type SortDirection } from '../../lib/table-sorting';
import type { CreditCard } from '../../types/credit-card';

type CreditCardTableProps = {
  cards: CreditCard[];
  isLoading: boolean;
  onEdit: (card: CreditCard) => void;
  onDelete: (card: CreditCard) => void;
};

export function CreditCardTable({ cards, isLoading, onEdit, onDelete }: CreditCardTableProps) {
  const { t, i18n } = useTranslation();
  const [sortBy, setSortBy] = useState<'name' | 'dueDay'>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith('pt') ? 'pt-BR' : 'en-US';
  const sortedCards = useMemo(() => sortRows(
    cards,
    (card) => sortBy === 'name' ? card.name : card.dueDay,
    sortDirection,
    locale,
  ), [cards, sortBy, sortDirection, locale]);

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  }

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
          <SortableTableHead direction={sortBy === 'name' ? sortDirection : null} onSort={() => toggleSort('name')}>
            {t('creditCards.table.name')}
          </SortableTableHead>
          <SortableTableHead className="w-[150px] text-right" align="right" direction={sortBy === 'dueDay' ? sortDirection : null} onSort={() => toggleSort('dueDay')}>
            {t('creditCards.table.dueDay')}
          </SortableTableHead>
          <TableHead className="w-[100px] text-right">{t('creditCards.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedCards.map((card) => (
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
