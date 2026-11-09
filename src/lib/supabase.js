import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-anon-key')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const STORAGE_KEYS = {
  LOCAL_SESSION_EMAIL: 'tai_budget_session_email',
  LOCAL_ACCOUNTS: 'tai_budget_accounts',
  LOCAL_TRANSACTIONS: 'tai_budget_transactions',
  LOCAL_CATEGORIES: 'tai_budget_categories',
  LOCAL_DEBTS: 'tai_budget_debts',
};

// Состав семьи Tai Budget (5 аккаунтов)
export const INITIAL_FAMILY_MEMBERS = [
  { id: 'member-papa', name: 'Папа', email: 'papa@tai.local', color: '#3B82F6', role: 'Глава семьи' },
  { id: 'member-mama', name: 'Мама', email: 'mama@tai.local', color: '#EC4899', role: 'Мама' },
  { id: 'member-mansur', name: 'Мансур', email: 'mansur@tai.local', color: '#8B5CF6', role: 'Старший брат' },
  { id: 'member-alisher', name: 'Алишер', email: 'alisher@tai.local', color: '#06B6D4', role: 'Средний брат' },
  { id: 'member-ahmad', name: 'Ахмад', email: 'ahmad@tai.local', color: '#10B981', role: 'Младший брат' },
];

export const INITIAL_ACCOUNTS = [
  { id: 'acc-card', name: 'Основная карта', type: 'card', balance: 425000 },
  { id: 'acc-cash', name: 'Наличные', type: 'cash', balance: 38500 },
  { id: 'acc-savings', name: 'Депозит / Копилка', type: 'savings', balance: 1200000 },
];

export const INITIAL_CATEGORIES = [
  {
    id: 'cat-groceries',
    name: 'Продукты',
    type: 'expense',
    monthly_budget: 150000,
    icon: 'shopping-cart',
    color: '#EF4444',
  },
  {
    id: 'cat-home',
    name: 'Коммуналка и дом',
    type: 'expense',
    monthly_budget: 40000,
    icon: 'home',
    color: '#F59E0B',
  },
  {
    id: 'cat-transport',
    name: 'Транспорт и бензин',
    type: 'expense',
    monthly_budget: 30000,
    icon: 'car',
    color: '#3B82F6',
  },
  {
    id: 'cat-entertainment',
    name: 'Развлечения и кафе',
    type: 'expense',
    monthly_budget: 35000,
    icon: 'coffee',
    color: '#8B5CF6',
  },
  {
    id: 'cat-health',
    name: 'Здоровье и аптека',
    type: 'expense',
    monthly_budget: 20000,
    icon: 'activity',
    color: '#EC4899',
  },
  {
    id: 'cat-debts',
    name: 'Кредиты и долги',
    type: 'expense',
    monthly_budget: 60000,
    icon: 'credit-card',
    color: '#6366F1',
  },
  {
    id: 'cat-salary',
    name: 'Зарплата / Доход',
    type: 'income',
    monthly_budget: 0,
    icon: 'dollar-sign',
    color: '#10B981',
  },
];

export const INITIAL_DEBTS = [
  {
    id: 'debt-kaspi',
    name: 'Рассрочка Kaspi',
    direction: 'owe',
    total_amount: 240000,
    paid_amount: 80000,
    monthly_payment: 20000,
    due_day: 15,
    note: 'Бытовая техника 0-0-12',
    is_closed: false,
  },
  {
    id: 'debt-credit',
    name: 'Кредит',
    direction: 'owe',
    total_amount: 1200000,
    paid_amount: 360000,
    monthly_payment: 40000,
    due_day: 25,
    note: 'Потребительский кредит',
    is_closed: false,
  },
];

/**
 * Находит участника семьи по email вошедшего пользователя.
 * Сопоставляет по полю email или по имени из эталонного списка INITIAL_FAMILY_MEMBERS.
 */
export function resolveMemberByEmail(members = [], email = '') {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  // 1. Прямое совпадение по полю email в списке из БД или локальном списке
  const directMatch = members.find(
    (m) => m.email && m.email.trim().toLowerCase() === normalizedEmail
  );
  if (directMatch) return directMatch;

  // 2. Сопоставление через эталонный список INITIAL_FAMILY_MEMBERS по имени (если в БД нет колонки email)
  const preset = INITIAL_FAMILY_MEMBERS.find(
    (m) => m.email.toLowerCase() === normalizedEmail
  );
  if (preset) {
    const byName = members.find(
      (m) => m.name && m.name.trim().toLowerCase() === preset.name.toLowerCase()
    );
    if (byName) return byName;
    // В режиме Supabase не подставляем локальный пресет: его id не является uuid
    // и вызовет ошибку внешнего ключа при сохранении операции.
    return isSupabaseConfigured ? null : preset;
  }

  return null;
}

// Начальные локальные транзакции для текущего месяца (если .env ещё не заполнен)
export function getInitialLocalTransactions() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return [
    {
      id: 'tx-1',
      amount: 64000,
      type: 'expense',
      category_id: 'cat-groceries',
      account_id: 'acc-card',
      member_id: 'member-mama',
      note: 'Закупка продуктов на неделю',
      transaction_date: `${ym}-03`,
    },
    {
      id: 'tx-2',
      amount: 34500,
      type: 'expense',
      category_id: 'cat-home',
      account_id: 'acc-card',
      member_id: 'member-papa',
      note: 'Квитанции ЖКХ и интернет',
      transaction_date: `${ym}-05`,
    },
    {
      id: 'tx-3',
      amount: 14000,
      type: 'expense',
      category_id: 'cat-transport',
      account_id: 'acc-card',
      member_id: 'member-mansur',
      note: 'Заправка полного бака',
      transaction_date: `${ym}-06`,
    },
    {
      id: 'tx-4',
      amount: 38500,
      type: 'expense',
      category_id: 'cat-entertainment',
      account_id: 'acc-card',
      member_id: 'member-alisher',
      note: 'Семейный ужин и кино',
      transaction_date: `${ym}-07`,
    },
    {
      id: 'tx-5',
      amount: 6500,
      type: 'expense',
      category_id: 'cat-health',
      account_id: 'acc-cash',
      member_id: 'member-ahmad',
      note: 'Витамины в аптеке',
      transaction_date: `${ym}-08`,
    },
  ];
}
