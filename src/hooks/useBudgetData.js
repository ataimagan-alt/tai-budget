import { useCallback, useEffect, useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  STORAGE_KEYS,
  INITIAL_FAMILY_MEMBERS,
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_DEBTS,
  getInitialLocalTransactions,
} from '../lib/supabase';
import { getMonthDateRange, toLocalISODate } from '../utils/formatters';
import {
  getBalanceDeltas,
  invertDeltas,
  mergeDeltas,
  applyDeltasToAccounts,
  sortTransactionsDesc,
} from '../utils/transactions';

const isRemote = Boolean(isSupabaseConfigured && supabase);

const DEBTS_CATEGORY_PRESET = {
  id: 'cat-debts',
  name: 'Кредиты и долги',
  type: 'expense',
  monthly_budget: 60000,
  icon: 'credit-card',
  color: '#6366F1',
};

// ---------- Локальное хранилище (если .env ещё не заполнен) ----------

function readLocal(key, fallbackFactory) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // повреждённые данные — пересоздаём из стартовых
  }
  const initial = fallbackFactory();
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readLocalCategoriesWithDebtPreset() {
  const list = readLocal(STORAGE_KEYS.LOCAL_CATEGORIES, () => INITIAL_CATEGORIES);
  const hasDebtsCategory = list.some(
    (c) =>
      c.id === 'cat-debts' ||
      (c.type === 'expense' && c.name && c.name.toLowerCase().includes('кредит'))
  );
  if (!hasDebtsCategory) {
    const updated = [...list, DEBTS_CATEGORY_PRESET];
    writeLocal(STORAGE_KEYS.LOCAL_CATEGORIES, updated);
    return updated;
  }
  return list;
}

const localStore = {
  accounts: () => readLocal(STORAGE_KEYS.LOCAL_ACCOUNTS, () => INITIAL_ACCOUNTS),
  categories: () => readLocalCategoriesWithDebtPreset(),
  debts: () => readLocal(STORAGE_KEYS.LOCAL_DEBTS, () => INITIAL_DEBTS),
  transactions: () => readLocal(STORAGE_KEYS.LOCAL_TRANSACTIONS, getInitialLocalTransactions),
};

// ---------- Supabase ----------

/**
 * Применяет изменения балансов к счетам в Supabase.
 * Перед обновлением перечитывает актуальный баланс из БД, чтобы не затереть
 * изменения, сделанные с другого телефона.
 */
async function applyDeltasRemote(deltas) {
  const ids = Object.keys(deltas).filter((id) => deltas[id] !== 0);
  if (ids.length === 0) return;

  const { data, error } = await supabase.from('accounts').select('id, balance').in('id', ids);
  if (error) throw error;

  for (const row of data || []) {
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: Number(row.balance || 0) + deltas[row.id] })
      .eq('id', row.id);
    if (updateError) throw updateError;
  }
}

/**
 * Находит (или создаёт в БД) категорию «Кредиты и долги» для записи платежа в историю.
 */
async function resolveDebtCategoryId(categories, direction) {
  if (direction === 'owed') {
    const incomeCat = categories.find((c) => c.type === 'income');
    if (incomeCat) return incomeCat.id;
  }

  const existing = categories.find(
    (c) =>
      c.id === 'cat-debts' ||
      (c.type === 'expense' &&
        c.name &&
        (c.name.toLowerCase().includes('кредит') || c.name.toLowerCase().includes('долг')))
  );
  if (existing) return existing.id;

  if (isRemote) {
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          name: DEBTS_CATEGORY_PRESET.name,
          type: 'expense',
          monthly_budget: DEBTS_CATEGORY_PRESET.monthly_budget,
          icon: DEBTS_CATEGORY_PRESET.icon,
          color: DEBTS_CATEGORY_PRESET.color,
        },
      ])
      .select()
      .single();
    if (!error && data?.id) return data.id;
  }

  return categories.find((c) => c.type === 'expense')?.id || null;
}

/**
 * Хук данных бюджета: загрузка справочников, кредитов/долгов и операций за месяц + все CRUD-операции.
 * Работает одинаково в режиме Supabase и в локальном режиме (localStorage).
 */
export function useBudgetData({ enabled, year, month }) {
  const [members, setMembers] = useState(INITIAL_FAMILY_MEMBERS);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [debts, setDebts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const { startDate, endDate } = getMonthDateRange(year, month);

    if (!isRemote) {
      setMembers(INITIAL_FAMILY_MEMBERS);
      setAccounts(localStore.accounts());
      setCategories(localStore.categories());
      setDebts(localStore.debts());
      setTransactions(
        sortTransactionsDesc(
          localStore
            .transactions()
            .filter((tx) => tx.transaction_date >= startDate && tx.transaction_date <= endDate)
        )
      );
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [membersRes, accountsRes, categoriesRes, debtsRes, txRes] = await Promise.all([
        supabase.from('family_members').select('*').order('created_at', { ascending: true }),
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('debts').select('*').order('created_at', { ascending: true }),
        supabase
          .from('transactions')
          .select('*')
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate),
      ]);

      for (const res of [membersRes, accountsRes, categoriesRes, txRes]) {
        if (res.error) throw res.error;
      }

      setMembers(membersRes.data || []);
      setAccounts(accountsRes.data || []);
      setCategories(categoriesRes.data || []);
      setDebts(debtsRes.error ? [] : debtsRes.data || []);
      setTransactions(sortTransactionsDesc(txRes.data || []));
    } catch (err) {
      setError(`Ошибка синхронизации с Supabase: ${err.message || 'проверьте таблицы'}`);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  // ---------- Операции ----------

  const addTransaction = useCallback(
    async (payload) => {
      const deltas = getBalanceDeltas(payload);

      if (isRemote) {
        const { error: insertError } = await supabase.from('transactions').insert([payload]);
        if (insertError) throw insertError;
        await applyDeltasRemote(deltas);
      } else {
        const tx = { ...payload, id: `tx-${Date.now()}`, created_at: new Date().toISOString() };
        writeLocal(STORAGE_KEYS.LOCAL_TRANSACTIONS, [tx, ...localStore.transactions()]);
        writeLocal(STORAGE_KEYS.LOCAL_ACCOUNTS, applyDeltasToAccounts(localStore.accounts(), deltas));
      }

      await refresh();
    },
    [refresh]
  );

  const updateTransaction = useCallback(
    async (id, payload) => {
      if (isRemote) {
        const { data: oldTx, error: readError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
        if (readError) throw readError;

        const { error: updateError } = await supabase.from('transactions').update(payload).eq('id', id);
        if (updateError) throw updateError;

        // Откатываем старое влияние на балансы и применяем новое
        await applyDeltasRemote(
          mergeDeltas(invertDeltas(getBalanceDeltas(oldTx)), getBalanceDeltas({ ...oldTx, ...payload }))
        );

        // Если операция привязана к кредиту/долгу и сумма изменилась — корректируем paid_amount
        if (oldTx.debt_id && payload.amount !== undefined) {
          const diff = Number(payload.amount || 0) - Number(oldTx.amount || 0);
          if (diff !== 0) {
            const { data: debtRow } = await supabase
              .from('debts')
              .select('id, total_amount, paid_amount')
              .eq('id', oldTx.debt_id)
              .single();
            if (debtRow) {
              const nextPaid = Math.max(0, Number(debtRow.paid_amount || 0) + diff);
              await supabase
                .from('debts')
                .update({
                  paid_amount: nextPaid,
                  is_closed: nextPaid >= Number(debtRow.total_amount || 0),
                })
                .eq('id', debtRow.id);
            }
          }
        }
      } else {
        const all = localStore.transactions();
        const oldTx = all.find((t) => t.id === id);
        if (!oldTx) throw new Error('Операция не найдена');

        const updatedTx = { ...oldTx, ...payload };
        writeLocal(
          STORAGE_KEYS.LOCAL_TRANSACTIONS,
          all.map((t) => (t.id === id ? updatedTx : t))
        );
        writeLocal(
          STORAGE_KEYS.LOCAL_ACCOUNTS,
          applyDeltasToAccounts(
            localStore.accounts(),
            mergeDeltas(invertDeltas(getBalanceDeltas(oldTx)), getBalanceDeltas(updatedTx))
          )
        );

        if (oldTx.debt_id && payload.amount !== undefined) {
          const diff = Number(payload.amount || 0) - Number(oldTx.amount || 0);
          if (diff !== 0) {
            writeLocal(
              STORAGE_KEYS.LOCAL_DEBTS,
              localStore.debts().map((d) => {
                if (d.id !== oldTx.debt_id) return d;
                const nextPaid = Math.max(0, Number(d.paid_amount || 0) + diff);
                return {
                  ...d,
                  paid_amount: nextPaid,
                  is_closed: nextPaid >= Number(d.total_amount || 0),
                };
              })
            );
          }
        }
      }

      await refresh();
    },
    [refresh]
  );

  const deleteTransaction = useCallback(
    async (id) => {
      if (isRemote) {
        const { data: oldTx, error: readError } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();
        if (readError) throw readError;

        const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id);
        if (deleteError) throw deleteError;

        await applyDeltasRemote(invertDeltas(getBalanceDeltas(oldTx)));

        if (oldTx.debt_id) {
          const { data: debtRow } = await supabase
            .from('debts')
            .select('id, total_amount, paid_amount')
            .eq('id', oldTx.debt_id)
            .single();
          if (debtRow) {
            const nextPaid = Math.max(0, Number(debtRow.paid_amount || 0) - Number(oldTx.amount || 0));
            await supabase
              .from('debts')
              .update({
                paid_amount: nextPaid,
                is_closed: nextPaid >= Number(debtRow.total_amount || 0),
              })
              .eq('id', debtRow.id);
          }
        }
      } else {
        const all = localStore.transactions();
        const oldTx = all.find((t) => t.id === id);
        if (!oldTx) throw new Error('Операция не найдена');

        writeLocal(
          STORAGE_KEYS.LOCAL_TRANSACTIONS,
          all.filter((t) => t.id !== id)
        );
        writeLocal(
          STORAGE_KEYS.LOCAL_ACCOUNTS,
          applyDeltasToAccounts(localStore.accounts(), invertDeltas(getBalanceDeltas(oldTx)))
        );

        if (oldTx.debt_id) {
          writeLocal(
            STORAGE_KEYS.LOCAL_DEBTS,
            localStore.debts().map((d) => {
              if (d.id !== oldTx.debt_id) return d;
              const nextPaid = Math.max(0, Number(d.paid_amount || 0) - Number(oldTx.amount || 0));
              return {
                ...d,
                paid_amount: nextPaid,
                is_closed: nextPaid >= Number(d.total_amount || 0),
              };
            })
          );
        }
      }

      await refresh();
    },
    [refresh]
  );

  // Ручная корректировка баланса счёта (без создания операции)
  const setAccountBalance = useCallback(
    async (accountId, balance) => {
      if (isRemote) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance })
          .eq('id', accountId);
        if (updateError) throw updateError;
      } else {
        writeLocal(
          STORAGE_KEYS.LOCAL_ACCOUNTS,
          localStore.accounts().map((a) => (a.id === accountId ? { ...a, balance } : a))
        );
      }

      await refresh();
    },
    [refresh]
  );

  // Создание новой категории или изменение существующей (в т.ч. месячного лимита)
  const saveCategory = useCallback(
    async (category) => {
      const { id, ...fields } = category;

      if (isRemote) {
        const query = id
          ? supabase.from('categories').update(fields).eq('id', id)
          : supabase.from('categories').insert([fields]);
        const { error: saveError } = await query;
        if (saveError) throw saveError;
      } else {
        const all = localStore.categories();
        const next = id
          ? all.map((c) => (c.id === id ? { ...c, ...fields } : c))
          : [...all, { ...fields, id: `cat-${Date.now()}`, created_at: new Date().toISOString() }];
        writeLocal(STORAGE_KEYS.LOCAL_CATEGORIES, next);
      }

      await refresh();
    },
    [refresh]
  );

  // ---------- Кредиты и Долги ----------

  const saveDebt = useCallback(
    async (debt) => {
      const { id, ...fields } = debt;
      const total = Number(fields.total_amount) || 0;
      const paid = Number(fields.paid_amount) || 0;
      const normalized = {
        ...fields,
        total_amount: total,
        paid_amount: paid,
        monthly_payment: fields.monthly_payment ? Number(fields.monthly_payment) : null,
        due_day: fields.due_day ? Number(fields.due_day) : null,
        note: fields.note?.trim() || null,
        is_closed: fields.is_closed !== undefined ? Boolean(fields.is_closed) : paid >= total,
      };

      if (isRemote) {
        const query = id
          ? supabase.from('debts').update(normalized).eq('id', id)
          : supabase.from('debts').insert([normalized]);
        const { error: saveError } = await query;
        if (saveError) throw saveError;
      } else {
        const all = localStore.debts();
        const next = id
          ? all.map((d) => (d.id === id ? { ...d, ...normalized } : d))
          : [
              ...all,
              {
                ...normalized,
                id: `debt-${Date.now()}`,
                created_at: new Date().toISOString(),
              },
            ];
        writeLocal(STORAGE_KEYS.LOCAL_DEBTS, next);
      }

      await refresh();
    },
    [refresh]
  );

  const deleteDebt = useCallback(
    async (id) => {
      if (isRemote) {
        const { error: deleteError } = await supabase.from('debts').delete().eq('id', id);
        if (deleteError) throw deleteError;
      } else {
        writeLocal(
          STORAGE_KEYS.LOCAL_DEBTS,
          localStore.debts().filter((d) => d.id !== id)
        );
      }

      await refresh();
    },
    [refresh]
  );

  /**
   * Внесение платежа по кредиту / долгу:
   * 1) Увеличивает paid_amount (и ставит is_closed = true при полном погашении)
   * 2) Списывает (для 'owe') или зачисляет (для 'owed') сумму на выбранный счёт
   * 3) Создаёт запись в transactions с категорией «Кредиты и долги» и debt_id
   */
  const payDebt = useCallback(
    async ({ debt, amount, accountId, memberId, note, date }) => {
      const numericAmount = Number(amount) || 0;
      if (numericAmount <= 0) throw new Error('Сумма платежа должна быть больше 0 ₸');

      const nextPaid = Number(debt.paid_amount || 0) + numericAmount;
      const isClosed = nextPaid >= Number(debt.total_amount || 0);
      const txType = debt.direction === 'owed' ? 'income' : 'expense';
      const categoryId = await resolveDebtCategoryId(categories, debt.direction);
      const defaultNote =
        debt.direction === 'owed'
          ? `Возврат долга: ${debt.name}`
          : `Платёж: ${debt.name}`;

      const txPayload = {
        amount: numericAmount,
        type: txType,
        category_id: categoryId,
        account_id: accountId,
        to_account_id: null,
        member_id: memberId || null,
        debt_id: debt.id,
        note: note?.trim() || defaultNote,
        transaction_date: date || toLocalISODate(),
      };

      const deltas = getBalanceDeltas(txPayload);

      if (isRemote) {
        const { error: debtErr } = await supabase
          .from('debts')
          .update({ paid_amount: nextPaid, is_closed: isClosed })
          .eq('id', debt.id);
        if (debtErr) throw debtErr;

        // Попытка вставить с debt_id; если колонка debt_id ещё не добавлена в БД, вставляем без неё
        let { error: txErr } = await supabase.from('transactions').insert([txPayload]);
        if (txErr && /debt_id/i.test(txErr.message || '')) {
          const { debt_id: _unused, ...fallbackPayload } = txPayload;
          const retry = await supabase.from('transactions').insert([fallbackPayload]);
          txErr = retry.error;
        }
        if (txErr) throw txErr;

        await applyDeltasRemote(deltas);
      } else {
        writeLocal(
          STORAGE_KEYS.LOCAL_DEBTS,
          localStore.debts().map((d) =>
            d.id === debt.id ? { ...d, paid_amount: nextPaid, is_closed: isClosed } : d
          )
        );

        const newTx = {
          ...txPayload,
          id: `tx-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        writeLocal(STORAGE_KEYS.LOCAL_TRANSACTIONS, [newTx, ...localStore.transactions()]);
        writeLocal(STORAGE_KEYS.LOCAL_ACCOUNTS, applyDeltasToAccounts(localStore.accounts(), deltas));
      }

      await refresh();
    },
    [categories, refresh]
  );

  return {
    members,
    accounts,
    categories,
    debts,
    transactions,
    loading,
    error,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setAccountBalance,
    saveCategory,
    saveDebt,
    deleteDebt,
    payDebt,
  };
}
