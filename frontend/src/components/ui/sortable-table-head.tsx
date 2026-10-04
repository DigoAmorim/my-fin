import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { TableHead } from './table';
import type { SortDirection } from '../../lib/table-sorting';

type SortableTableHeadProps = {
  children: ReactNode;
  direction: SortDirection | null;
  onSort: () => void;
  className?: string;
  align?: 'left' | 'right';
  buttonClassName?: string;
};

export function SortableTableHead({
  children,
  direction,
  onSort,
  className = '',
  align = 'left',
  buttonClassName = '',
}: SortableTableHeadProps) {
  const Indicator = direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead
      aria-sort={direction ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex w-full cursor-pointer select-none items-center gap-1 text-inherit hover:text-foreground ${align === 'right' ? 'justify-end text-right' : 'justify-start text-left'} ${buttonClassName}`}
      >
        <span>{children}</span>
        {direction ? <Indicator size={12} className="shrink-0" aria-hidden="true" /> : null}
      </button>
    </TableHead>
  );
}
