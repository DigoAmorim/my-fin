import type { ComponentProps } from 'react';

type TableProps = ComponentProps<'table'>;
type TableSectionProps = ComponentProps<'thead'>;
type TableBodyProps = ComponentProps<'tbody'>;
type TableRowProps = ComponentProps<'tr'>;
type TableHeadProps = ComponentProps<'th'>;
type TableCellProps = ComponentProps<'td'>;

export function Table({ className = '', ...props }: TableProps) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={`w-full min-w-[560px] border-collapse text-left ${className}`.trim()} {...props} />
    </div>
  );
}

export function TableHeader({ className = '', ...props }: TableSectionProps) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className = '', ...props }: TableBodyProps) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`.trim()} {...props} />;
}

export function TableRow({ className = '', ...props }: TableRowProps) {
  return <tr className={`border-b border-border transition-colors hover:bg-muted ${className}`.trim()} {...props} />;
}

export function TableHead({ className = '', ...props }: TableHeadProps) {
  return <th className={`whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-muted-foreground sm:px-5 ${className}`.trim()} {...props} />;
}

export function TableCell({ className = '', ...props }: TableCellProps) {
  return <td className={`whitespace-nowrap px-4 py-3 align-middle text-sm text-foreground sm:px-5 ${className}`.trim()} {...props} />;
}