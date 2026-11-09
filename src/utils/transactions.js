export const TRANSACTION_TYPE_LABELS = {
  expense: 'Расход',
  income: 'Доход',
  transfer: 'Перевод',
};

/**
 * Возвращает влияние операции на балансы счетов: { [accountId]: delta }
 *  - расход:  счёт  -amount
 *  - доход:   счёт  +amount
 *  - перевод: откуда -amount, куда +amount
 */
export function getBalanceDeltas(tx) {
  const deltas = {};
  if (!tx) return deltas;

  const amount = Number(tx.amount) || 0;
  const add = (accountId, value) => {
    if (!accountId) return;
    deltas[accountId] = (deltas[accountId] || 0) + value;
  };

  if (tx.type === 'income') {
    add(tx.account_id, amount);
  } else if (tx.type === 'expense') {
    add(tx.account_id, -amount);
  } else if (tx.type === 'transfer') {
    add(tx.account_id, -amount);
    add(tx.to_account_id, amount);
  }

  return deltas;
}

/** Инвертирует изменения балансов (для отката операции) */
export function invertDeltas(deltas) {
  const result = {};
  for (const [id, value] of Object.entries(deltas)) {
    result[id] = -value;
  }
  return result;
}

/** Складывает несколько наборов изменений балансов */
export function mergeDeltas(...deltaMaps) {
  const result = {};
  for (const map of deltaMaps) {
    for (const [id, value] of Object.entries(map)) {
      result[id] = (result[id] || 0) + value;
    }
  }
  return result;
}

/** Применяет изменения балансов к массиву счетов (локальный режим) */
export function applyDeltasToAccounts(accounts, deltas) {
  return accounts.map((acc) =>
    deltas[acc.id]
      ? { ...acc, balance: Number(acc.balance || 0) + deltas[acc.id] }
      : acc
  );
}

/** Сортировка: сначала новые даты, внутри дня — последние добавленные */
export function sortTransactionsDesc(list) {
  return [...list].sort((a, b) => {
    const byDate = String(b.transaction_date).localeCompare(String(a.transaction_date));
    if (byDate !== 0) return byDate;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
}

/** Группирует (уже отсортированные) операции по дате */
export function groupTransactionsByDate(list) {
  const groups = [];
  const index = {};

  for (const tx of list) {
    const key = tx.transaction_date;
    if (!(key in index)) {
      index[key] = groups.length;
      groups.push({ date: key, items: [], income: 0, expense: 0 });
    }
    const group = groups[index[key]];
    group.items.push(tx);
    if (tx.type === 'income') group.income += Number(tx.amount) || 0;
    if (tx.type === 'expense') group.expense += Number(tx.amount) || 0;
  }

  return groups;
}

/** Подпись счёта для операции: "Наличные" или "Основная карта → Копилка" */
export function getAccountLabel(tx, accountById) {
  const from = accountById[tx.account_id]?.name || 'Счёт удалён';
  if (tx.type === 'transfer') {
    const to = accountById[tx.to_account_id]?.name || 'Счёт удалён';
    return `${from} → ${to}`;
  }
  return from;
}
