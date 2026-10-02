import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import type { PaidTransaction } from './transaction-api';

export type InvoicePdfLabels = {
  title: string;
  month: string;
  generatedAt: string;
  totalsByDebtor: string;
  debtor: string;
  total: string;
  noDebtor: string;
  date: string;
  description: string;
  purchaseType: string;
  type: string;
  installments: string;
  amount: string;
  page: string;
  transactionTypeLabels: Record<PaidTransaction['transactionType'], string>;
  purchaseTypeLabels: Record<PaidTransaction['purchaseType'], string>;
};

type InvoicePdfInput = {
  cardName: string;
  month: string;
  locale: string;
  transactions: PaidTransaction[];
  labels: InvoicePdfLabels;
};

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

function transactionNetAmount(transaction: PaidTransaction): number {
  const amount = Math.abs(Number(transaction.installmentAmount));
  return amount;
}

function currencyFormatter(locale: string): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function displayMonth(month: string, locale: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

function safeFilePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function downloadInvoicePdf({ cardName, month, locale, transactions, labels }: InvoicePdfInput): void {
  const document = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable;
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 15;
  const currency = currencyFormatter(locale);
  const groups = new Map<string, PaidTransaction[]>();

  // Empty string is a deliberate group key so transactions without a debtor remain selectable and printable together.
  for (const transaction of transactions) {
    const debtor = transaction.debtor?.trim() ?? '';
    const group = groups.get(debtor) ?? [];
    group.push(transaction);
    groups.set(debtor, group);
  }

  const orderedGroups = [...groups.entries()].sort(([left], [right]) => {
    if (!left) return 1;
    if (!right) return -1;
    return left.localeCompare(right, locale);
  });
  const debtorTotals = orderedGroups
    .map(([debtor, items]) => [
      debtor || labels.noDebtor,
      currency.format(items.reduce((total, transaction) => total + transactionNetAmount(transaction), 0)),
    ]);

  document.setFillColor(24, 43, 65);
  document.rect(0, 0, pageWidth, 42, 'F');
  document.setTextColor(255, 255, 255);
  document.setFont('helvetica', 'bold');
  document.setFontSize(10);
  document.text(labels.title.toLocaleUpperCase(locale), margin, 13);
  document.setFontSize(20);
  document.text(cardName, margin, 23, { maxWidth: pageWidth - margin * 2 });
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.text(`${labels.month} ${displayMonth(month, locale)}`, margin, 32);
  document.setFontSize(8);
  document.text(`${labels.generatedAt}: ${new Date().toLocaleDateString(locale)}`, pageWidth - margin, 32, { align: 'right' });

  let cursorY = 50;
  document.setTextColor(24, 43, 65);
  document.setFont('helvetica', 'bold');
  document.setFontSize(12);
  document.text(labels.totalsByDebtor, margin, cursorY);
  cursorY += 3;

  if (debtorTotals.length > 0) {
    autoTable(document, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [[labels.debtor, labels.total]],
      body: debtorTotals,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: [38, 48, 58] },
      headStyles: { fillColor: [235, 240, 245], textColor: [24, 43, 65], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right', cellWidth: 48 } },
    });
    cursorY = (document.lastAutoTable?.finalY ?? cursorY) + 9;
  } else {
    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.setTextColor(100, 110, 120);
    document.text('-', margin, cursorY + 7);
    cursorY += 15;
  }

  for (const [debtor, items] of orderedGroups) {
    if (cursorY > pageHeight - 45) {
      document.addPage();
      cursorY = margin;
    }

    const groupTotal = items.reduce((total, transaction) => total + transactionNetAmount(transaction), 0);
    document.setTextColor(24, 43, 65);
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    document.text(debtor || labels.noDebtor, margin, cursorY);
    document.setFontSize(9);
    document.text(`${labels.total}: ${currency.format(groupTotal)}`, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += 3;

    autoTable(document, {
      startY: cursorY,
      margin: { left: margin, right: margin, bottom: 17 },
      head: [[labels.date, labels.description, labels.purchaseType, labels.type, labels.installments, labels.amount]],
      body: items.map((transaction) => [
        new Date(`${transaction.date}T00:00:00`).toLocaleDateString(locale),
        transaction.description || '-',
        labels.purchaseTypeLabels[transaction.purchaseType],
        labels.transactionTypeLabels[transaction.transactionType],
        `${transaction.currentInstallment}/${transaction.totalInstallments}`,
        currency.format(transactionNetAmount(transaction)),
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, textColor: [38, 48, 58], overflow: 'linebreak' },
      headStyles: { fillColor: [24, 43, 65], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 23 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 27 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 35, halign: 'right' },
      },
    });
    cursorY = (document.lastAutoTable?.finalY ?? cursorY) + 9;
  }

  const pageCount = document.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page);
    document.setDrawColor(220, 225, 230);
    document.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.setTextColor(100, 110, 120);
    document.text(`${cardName} · ${displayMonth(month, locale)}`, margin, pageHeight - 7);
    document.text(`${labels.page} ${page}/${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  document.save(`fatura-${safeFilePart(cardName)}-${month}.pdf`);
}