// Download transactions as a CSV file (opens in Excel / Google Sheets)
export function downloadTransactionsCsv(transactions, fileName) {
  const header = ['Date', 'Type', 'Category', 'Amount', 'Payment method', 'Note'];
  const rows = transactions.map((t) => [t.date.slice(0, 10), t.type, t.category, t.amount, t.paymentMethod, t.note]);

  const cell = (value) => {
    const text = String(value ?? '');
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; // stop spreadsheets treating text as a formula
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');

  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
}
