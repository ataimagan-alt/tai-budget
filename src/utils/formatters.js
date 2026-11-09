const MONTH_NAMES_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

/**
 * Форматирует сумму в тенге: 150000 -> "150 000 ₸"
 */
export function formatCurrency(value) {
  const num = Number(value) || 0;
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(num));
  return `${formatted} ₸`;
}

/**
 * Возвращает название месяца и год: "Ноябрь 2026"
 */
export function formatMonthYear(year, monthIndex) {
  return `${MONTH_NAMES_RU[monthIndex]} ${year}`;
}

/**
 * Возвращает диапазон дат месяца (YYYY-MM-DD) для SQL-запросов в Supabase
 */
export function getMonthDateRange(year, monthIndex) {
  const startMonth = String(monthIndex + 1).padStart(2, '0');
  const startDate = `${year}-${startMonth}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const endDate = `${year}-${startMonth}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

/**
 * Дата в формате YYYY-MM-DD по ЛОКАЛЬНОМУ времени устройства
 * (toISOString() даёт UTC и после полуночи по Алматы может вернуть вчерашний день).
 */
export function toLocalISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Превращает строку YYYY-MM-DD в локальный объект Date (без сдвига часового пояса)
 */
export function parseISODate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * "2026-11-09" -> "09.11.2026"
 */
export function formatDateRu(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Заголовок дня для истории: "Сегодня", "Вчера" или "понедельник, 9 ноября"
 */
export function formatDayHeader(dateStr) {
  const date = parseISODate(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === toLocalISODate(today)) return 'Сегодня';
  if (dateStr === toLocalISODate(yesterday)) return 'Вчера';

  const label = date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Разбирает введённую пользователем сумму: "12 500,5" -> 12500.5
 */
export function parseAmount(value) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, '')
    .replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : NaN;
}
