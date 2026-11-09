import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  Download,
  FilterX,
  ReceiptText,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import AppHeader from './AppHeader';
import MemberBadge from './ui/MemberBadge';
import { CategoryIcon } from '../utils/icons';
import { formatCurrency, formatDayHeader } from '../utils/formatters';
import { getAccountLabel, groupTransactionsByDate } from '../utils/transactions';

const TRANSFER_FILTER = '__transfer';

function FilterSelect({ value, onChange, children, icon: Icon }) {
  return (
    <div className="relative">
      <Icon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 truncate"
      >
        {children}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function TransactionRow({ tx, category, member, accountLabel, onClick }) {
  const isTransfer = tx.type === 'transfer';
  const isIncome = tx.type === 'income';
  const amount = Number(tx.amount) || 0;

  const title = isTransfer ? 'Перевод между счетами' : category?.name || 'Без категории';
  const amountClass = isIncome ? 'text-emerald-600' : isTransfer ? 'text-slate-700' : 'text-rose-600';
  const sign = isIncome ? '+' : isTransfer ? '' : '−';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 active:bg-slate-100 transition"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
        style={{ backgroundColor: isTransfer ? '#475569' : category?.color || '#94A3B8' }}
      >
        {isTransfer ? (
          <ArrowLeftRight className="w-5 h-5" />
        ) : (
          <CategoryIcon name={category?.icon} className="w-5 h-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
        {tx.note && <p className="text-xs text-slate-500 truncate">{tx.note}</p>}
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <MemberBadge member={member} />
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 min-w-0">
            <Wallet className="w-3 h-3 shrink-0" />
            <span className="truncate">{accountLabel}</span>
          </span>
        </div>
      </div>

      <p className={`shrink-0 text-sm font-bold ${amountClass}`}>
        {sign}
        {formatCurrency(amount)}
      </p>
    </button>
  );
}

export default function HistoryView({
  headerProps,
  transactions = [],
  members = [],
  categories = [],
  accounts = [],
  onTransactionClick,
  onExport,
  exporting = false,
}) {
  const [memberFilter, setMemberFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const hasFilters = memberFilter !== 'all' || categoryFilter !== 'all' || accountFilter !== 'all';

  const filtered = useMemo(
    () =>
      transactions.filter((tx) => {
        if (memberFilter !== 'all' && String(tx.member_id) !== memberFilter) return false;
        if (categoryFilter === TRANSFER_FILTER && tx.type !== 'transfer') return false;
        if (
          categoryFilter !== 'all' &&
          categoryFilter !== TRANSFER_FILTER &&
          String(tx.category_id) !== categoryFilter
        )
          return false;
        if (
          accountFilter !== 'all' &&
          String(tx.account_id) !== accountFilter &&
          String(tx.to_account_id) !== accountFilter
        )
          return false;
        return true;
      }),
    [transactions, memberFilter, categoryFilter, accountFilter]
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += Number(tx.amount) || 0;
      if (tx.type === 'expense') expense += Number(tx.amount) || 0;
    }
    return { income, expense, count: filtered.length };
  }, [filtered]);

  const groups = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  const resetFilters = () => {
    setMemberFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
  };

  return (
    <>
      <AppHeader {...headerProps} subtitle="История и Отчёт">
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/60 border border-slate-700/80 rounded-3xl p-4">
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-700">
            <div className="px-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Доходы</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">+{formatCurrency(totals.income)}</p>
            </div>
            <div className="px-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Расходы</p>
              <p className="text-sm font-bold text-rose-400 mt-1">−{formatCurrency(totals.expense)}</p>
            </div>
            <div className="px-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Операций</p>
              <p className="text-sm font-bold text-white mt-1">{totals.count}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={exporting || transactions.length === 0}
            className="mt-4 w-full py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-40 text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            {exporting ? 'Формирование файла...' : 'Скачать Excel (.xlsx)'}
          </button>
          {transactions.length > 0 && hasFilters && (
            <p className="text-[11px] text-slate-400 text-center mt-2">
              В файл попадут все операции месяца без учёта фильтров
            </p>
          )}
        </div>
      </AppHeader>

      <main className="max-w-md mx-auto px-4 mt-5 space-y-5">
        {/* Компактные фильтры: автор, категория, счёт */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3">
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Фильтры
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <FilterX className="w-3.5 h-3.5" />
                Сбросить
              </button>
            )}
          </div>

          {/* Автор — цветные чипы с горизонтальной прокруткой */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 pb-1">
            <button
              type="button"
              onClick={() => setMemberFilter('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                memberFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Все
            </button>
            {members.map((m) => {
              const isActive = memberFilter === String(m.id);
              const color = m.color || '#3B82F6';
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMemberFilter(isActive ? 'all' : String(m.id))}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition"
                  style={
                    isActive
                      ? { backgroundColor: color, borderColor: color, color: '#fff' }
                      : { backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#475569' }
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isActive ? '#fff' : color }}
                  />
                  {m.name}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} icon={ReceiptText}>
              <option value="all">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
              <option value={TRANSFER_FILTER}>Переводы</option>
            </FilterSelect>

            <FilterSelect value={accountFilter} onChange={setAccountFilter} icon={Wallet}>
              <option value="all">Все счета</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </FilterSelect>
          </div>
        </section>

        {/* Список операций с группировкой по дням */}
        {groups.length === 0 ? (
          <div className="text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {hasFilters ? 'Нет операций по выбранным фильтрам' : 'В этом месяце операций пока нет'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {hasFilters ? 'Попробуйте сбросить фильтры' : 'Нажмите «+», чтобы добавить первую'}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.date}>
              <div className="flex items-baseline justify-between px-1 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {formatDayHeader(group.date)}
                </h3>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  {group.income > 0 && <span className="text-emerald-600">+{formatCurrency(group.income)}</span>}
                  {group.expense > 0 && <span className="text-rose-600">−{formatCurrency(group.expense)}</span>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
                {group.items.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    category={categoryById[tx.category_id]}
                    member={memberById[tx.member_id]}
                    accountLabel={getAccountLabel(tx, accountById)}
                    onClick={() => onTransactionClick(tx)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}
