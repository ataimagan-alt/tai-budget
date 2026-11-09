import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { formatDateRu, formatMonthYear } from './formatters';
import { TRANSACTION_TYPE_LABELS, getAccountLabel } from './transactions';

const HEADERS = ['Дата', 'Участник', 'Тип', 'Категория', 'Счёт', 'Сумма (₸)', 'Комментарий'];
const AMOUNT_COLUMN_INDEX = 5;

/**
 * Формирует и скачивает Tai_Budget_ГГГГ_ММ.xlsx со всеми операциями месяца.
 * В браузере файл скачивается сразу, в Android-приложении (Capacitor) —
 * сохраняется в кэш и открывается системное окно «Поделиться / Сохранить».
 */
export async function exportTransactionsToExcel({
  transactions,
  members,
  categories,
  accounts,
  year,
  month,
}) {
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  // В Excel удобнее хронологический порядок
  const chronological = [...transactions].sort((a, b) => {
    const byDate = String(a.transaction_date).localeCompare(String(b.transaction_date));
    if (byDate !== 0) return byDate;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });

  const rows = chronological.map((tx) => {
    const amount = Number(tx.amount) || 0;
    return {
      'Дата': formatDateRu(tx.transaction_date),
      'Участник': memberById[tx.member_id]?.name || '—',
      'Тип': TRANSACTION_TYPE_LABELS[tx.type] || tx.type,
      'Категория':
        tx.type === 'transfer'
          ? 'Перевод между счетами'
          : categoryById[tx.category_id]?.name || 'Без категории',
      'Счёт': getAccountLabel(tx, accountById),
      // Расход со знаком минус, чтобы итог столбца сразу показывал баланс месяца
      'Сумма (₸)': tx.type === 'expense' ? -amount : amount,
      'Комментарий': tx.note || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 24 },
    { wch: 32 },
    { wch: 14 },
    { wch: 40 },
  ];

  // Формат чисел с разделителем тысяч для столбца суммы
  for (let r = 1; r <= rows.length; r += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r, c: AMOUNT_COLUMN_INDEX })];
    if (cell) cell.z = '#,##0';
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, formatMonthYear(year, month));

  const fileName = `Tai_Budget_${year}_${String(month + 1).padStart(2, '0')}.xlsx`;

  if (Capacitor.isNativePlatform()) {
    const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: fileName,
      url: uri,
      dialogTitle: 'Сохранить или отправить отчёт',
    });
  } else {
    XLSX.writeFile(workbook, fileName);
  }

  return fileName;
}
