import React, { useMemo } from 'react';
import { AlertTriangle, Pencil, Plus } from 'lucide-react';
import AppHeader from './AppHeader';
import { formatCurrency } from '../utils/formatters';
import { AccountIcon, CategoryIcon } from '../utils/icons';

const ACCOUNT_TYPE_LABELS = {
  card: 'Карта',
  cash: 'Наличные',
  savings: 'Копилка',
};

/**
 * Цвет полоски прогресса конверта:
 * зелёная (< 75%) -> жёлтая (75%..99%) -> красная (>= 100% / перерасход)
 */
function getEnvelopeProgressStyle(spent, budget) {
  if (budget <= 0) {
    return {
      barClass: spent > 0 ? 'bg-rose-500' : 'bg-emerald-500',
      badgeClass:
        spent > 0
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      statusText: spent > 0 ? 'Вне лимита' : 'Без лимита',
      percent: spent > 0 ? 100 : 0,
      rawPercent: spent > 0 ? 100 : 0,
    };
  }

  const rawPercent = Math.round((spent / budget) * 100);
  const clampedPercent = Math.min(100, Math.max(0, (spent / budget) * 100));

  if (spent > budget || rawPercent >= 100) {
    return {
      barClass: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      statusText: spent > budget ? 'Перерасход' : 'Лимит исчерпан',
      percent: 100,
      rawPercent,
    };
  }

  if (rawPercent >= 75) {
    return {
      barClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      statusText: `${rawPercent}%`,
      percent: clampedPercent,
      rawPercent,
    };
  }

  return {
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    statusText: `${rawPercent}%`,
    percent: clampedPercent,
    rawPercent,
  };
}

export default function BudgetView({
  headerProps,
  accounts = [],
  categories = [],
  transactions = [],
  spentByCategory = {},
  onAccountClick,
  onCategoryClick,
  onAddCategory,
}) {
  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);
  const incomeCategories = useMemo(() => categories.filter((c) => c.type === 'income'), [categories]);

  const summary = useMemo(() => {
    const totalBudget = expenseCategories.reduce((acc, cat) => acc + Number(cat.monthly_budget || 0), 0);
    const totalSpent = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    return {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      progressStyle: getEnvelopeProgressStyle(totalSpent, totalBudget),
    };
  }, [expenseCategories, transactions]);

  return (
    <>
      <AppHeader {...headerProps} subtitle="Бюджет и Конверты">
        {/* Сводная плашка: Общий бюджет, Всего потрачено, Остаток */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-3xl p-5 shadow-xl shadow-blue-950/40 border border-blue-400/20">
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-blue-400/25">
            <div className="px-1">
              <p className="text-[11px] font-medium text-blue-100/80 uppercase tracking-wider">Общий бюджет</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">{formatCurrency(summary.totalBudget)}</p>
            </div>
            <div className="px-1">
              <p className="text-[11px] font-medium text-blue-100/80 uppercase tracking-wider">Всего потрачено</p>
              <p className="text-sm sm:text-base font-bold text-white mt-1">{formatCurrency(summary.totalSpent)}</p>
            </div>
            <div className="px-1">
              <p className="text-[11px] font-medium text-blue-100/80 uppercase tracking-wider">Остаток</p>
              <p
                className={`text-sm sm:text-base font-bold mt-1 ${
                  summary.remaining < 0 ? 'text-rose-200' : 'text-emerald-200'
                }`}
              >
                {formatCurrency(summary.remaining)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-blue-100 mb-1.5">
              <span>Исполнение бюджета за месяц</span>
              <span className="font-semibold">{summary.progressStyle.rawPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950/35 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${summary.progressStyle.barClass}`}
                style={{ width: `${summary.progressStyle.percent}%` }}
              />
            </div>
          </div>
        </div>
      </AppHeader>

      <main className="max-w-md mx-auto px-4 mt-5 space-y-6">
        {/* Счета: клик — быстрая корректировка баланса */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Счета и кошельки</h2>
            <span className="text-xs font-medium text-slate-400">
              Всего: {formatCurrency(accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0))}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {accounts.map((account) => {
              const isSavings = account.type === 'savings';
              const isCard = account.type === 'card';
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => onAccountClick(account)}
                  title="Изменить баланс"
                  className="group text-left bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-blue-300 active:scale-[0.98] transition"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isCard
                          ? 'bg-blue-50 text-blue-600'
                          : isSavings
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      <AccountIcon type={account.type} className="w-4 h-4" />
                    </div>
                    <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                    </p>
                    <p className="text-xs font-medium text-slate-600 truncate" title={account.name}>
                      {account.name}
                    </p>
                    <p
                      className={`text-sm font-bold mt-0.5 tracking-tight ${
                        Number(account.balance) < 0 ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Конверты категорий: клик — изменение месячного лимита */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Конверты категорий</h2>
            <button
              type="button"
              onClick={onAddCategory}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              Категория
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> норма
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> &gt;75%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> лимит
            </span>
            <span className="ml-auto text-slate-400">нажмите, чтобы изменить лимит</span>
          </div>

          <div className="space-y-3">
            {expenseCategories.map((category) => {
              const spent = spentByCategory[category.id] || 0;
              const budget = Number(category.monthly_budget || 0);
              const remaining = budget - spent;
              const isOverBudget = remaining < 0;
              const progress = getEnvelopeProgressStyle(spent, budget);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onCategoryClick(category)}
                  className={`w-full text-left bg-white rounded-2xl p-4 border transition shadow-sm active:scale-[0.99] ${
                    isOverBudget
                      ? 'border-rose-200 ring-1 ring-rose-100 hover:border-rose-300'
                      : 'border-slate-200/80 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
                        style={{ backgroundColor: category.color || '#10B981' }}
                      >
                        <CategoryIcon name={category.icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{category.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Потрачено <span className="font-semibold text-slate-800">{formatCurrency(spent)}</span> из{' '}
                          <span className="font-semibold text-slate-800">{formatCurrency(budget)}</span>{' '}
                          <span className={`font-semibold ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                            (остаток {formatCurrency(remaining)})
                          </span>
                        </p>
                      </div>
                    </div>

                    <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${progress.badgeClass}`}>
                      {progress.statusText}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progress.barClass}`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>

                  {isOverBudget && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Перерасход конверта на {formatCurrency(Math.abs(remaining))}</span>
                    </div>
                  )}
                </button>
              );
            })}

            {expenseCategories.length === 0 && (
              <div className="text-center text-sm text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
                Пока нет ни одного конверта. Нажмите «+ Категория», чтобы создать первый.
              </div>
            )}
          </div>
        </section>

        {/* Категории доходов — компактные чипы для редактирования */}
        {incomeCategories.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Категории доходов</h2>
            <div className="flex flex-wrap gap-2">
              {incomeCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onCategoryClick(category)}
                  className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-700 transition active:scale-95"
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: category.color || '#10B981' }}
                  >
                    <CategoryIcon name={category.icon} className="w-3.5 h-3.5" />
                  </span>
                  {category.name}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
