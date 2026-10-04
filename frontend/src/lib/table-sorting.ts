export type SortDirection = 'asc' | 'desc';
export type SortValue = number | string | null | undefined;

export function sortRows<T>(
  rows: T[],
  getValue: (row: T) => SortValue,
  direction: SortDirection,
  locale: string,
): T[] {
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((left, right) => {
      if (left.value == null && right.value != null) return 1;
      if (left.value != null && right.value == null) return -1;
      if (left.value == null && right.value == null) return left.index - right.index;

      const comparison = typeof left.value === 'number' && typeof right.value === 'number'
        ? left.value - right.value
        : String(left.value).localeCompare(String(right.value), locale, {
          numeric: true,
          sensitivity: 'base',
        });
      return (direction === 'asc' ? comparison : -comparison) || left.index - right.index;
    })
    .map(({ row }) => row);
}
