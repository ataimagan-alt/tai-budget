import React, { useMemo, useState } from 'react';
import {
  Landmark,
  Plus,
  Pencil,
  CalendarClock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
} from 'lucide-react';
import AppHeader from './AppHeader';
import { formatCurrency } from '../utils/formatters';

function formatPaymentScheduleHint(debt) {
  const hasMonthly = Number(debt.monthly_payment) > 0;
  const hasDueDay = Number(debt.due_day) >= 1 && Number(debt.due_day) <= 31;

  if (!hasMonthly && !hasDueDay) return null;

  const parts = [];
  if (hasMonthly) {
    parts.push(`Платёж: ${formatCurrency(debt.monthly_payment)}`);
  }
  if (hasDueDay) {
    parts.push(`до ${debt.due_day}-го числа`);
  }
  return parts.join(' • ');
}

export default function DebtsView({
  headerProps,
  debts = [],
  onAddDebt,
  onEditDebt,
  onPayDebt,
}) {
  const [activeDirection, setActiveDirection] = useState('owe'); // 'owe' | 'owed'

  // Сводные показатели по активным кредитам и долгам семьи
  const summary = useMemo(() => {
    const activeOwe = debts.filter((d) => (d.direction || 'owe') === 'owe' && !d.is_closed);
    const activeOwed = debts.filter((d) => d.direction === 'owed' && !d.is_closed);

    const totalRemainingOwe = activeOwe.reduce(
      (sum, d) => sum + Math.max(0, Number(d.total_amount || 0) - Number(d.paid_amount || 0)),
      0
    );
    const totalMonthlyOwe = activeOwe.reduce(
      (sum, d) => sum + (Number(d.monthly_payment) || 0),
      0
    );
    const totalAmountOwe = activeOwe.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);
    const totalPaidOwe = activeOwe.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0);
    const overallPercent =
      totalAmountOwe > 0
        ? Math.min(100, Math.round((totalPaidOwe / totalAmountOwe) * 100))
        : 0;

    const totalRemainingOwed = activeOwed.reduce(
      (sum, d) => sum + Math.max(0, Number(d.total_amount || 0) - Number(d.paid_amount || 0)),
      0
    );

    return {
      totalRemainingOwe,
      totalMonthlyOwe,
      overallPercent,
      activeOweCount: activeOwe.length,
      activeOwedCount: activeOwed.length,
      totalRemainingOwed,
    };
  }, [debts]);

  // Список записей выбранного подраздела (сначала активные, затем закрытые)
  const filteredDebts = useMemo(() => {
    return debts
      .filter((d) => (d.direction || 'owe') === activeDirection)
      .sort((a, b) => Number(Boolean(a.is_closed)) - Number(Boolean(b.is_closed)));
  }, [debts, activeDirection]);

  return (
    <>
      <AppHeader {...headerProps} subtitle="Кредиты и Долги">
        {/* Сводная плашка по всем активным кредитам/долгам семьи */}
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-slate-800 rounded-3xl p-5 shadow-xl shadow-slate-950/40 border border-indigo-400/25">
          <div className="grid grid-cols-2 gap-3 text-center divide-x divide-indigo-400/25">
            <div className="px-2">
              <p className="text-[11px] font-medium text-indigo-100/80 uppercase tracking-wider">
                Остаток по кредитам
              </p>
              <p className="text-base sm:text-lg font-extrabold text-white mt-1">
                {formatCurrency(summary.totalRemainingOwe)}
              </p>
            </div>

            <div className="px-2">
              <p className="text-[11px] font-medium text-indigo-100/80 uppercase tracking-wider">
                Ежемесячный платёж
              </p>
              <p className="text-base sm:text-lg font-extrabold text-amber-200 mt-1">
                {formatCurrency(summary.totalMonthlyOwe)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-indigo-100 mb-1.5">
              <span>Погашено по активным кредитам</span>
              <span className="font-semibold">{summary.overallPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-950/35 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${summary.overallPercent}%` }}
              />
            </div>
          </div>

          {summary.totalRemainingOwed > 0 && (
            <div className="mt-3 pt-2.5 border-t border-indigo-400/20 flex items-center justify-between text-xs text-indigo-100">
              <span>Нам должны вернуть:</span>
              <span className="font-bold text-emerald-300">
                {formatCurrency(summary.totalRemainingOwed)}
              </span>
            </div>
          )}
        </div>
      </AppHeader>

      <main className="max-w-md mx-auto px-4 mt-5 space-y-4">
        {/* Переключатель подразделов + кнопка «+ Добавить» */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 grid grid-cols-2 gap-1 p-1 bg-slate-200/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveDirection('owe')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition ${
                activeDirection === 'owe'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Кредиты и наши долги ({summary.activeOweCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveDirection('owed')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition ${
                activeDirection === 'owed'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Нам должны ({summary.activeOwedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAddDebt(activeDirection)}
            className="shrink-0 inline-flex items-center gap-1 px-3.5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Добавить
          </button>
        </div>

        {/* Список карточек кредитов / долгов */}
        {filteredDebts.length === 0 ? (
          <div className="text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
            <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {activeDirection === 'owe'
                ? 'У семьи нет активных кредитов и рассрочек'
                : 'В разделе «Нам должны» пока пусто'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Нажмите «+ Добавить», чтобы создать запись
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDebts.map((debt) => {
              const total = Number(debt.total_amount) || 0;
              const paid = Number(debt.paid_amount) || 0;
              const remaining = Math.max(0, total - paid);
              const isClosed = Boolean(debt.is_closed || (total > 0 && paid >= total));
              const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
              const scheduleHint = formatPaymentScheduleHint(debt);
              const isOwedToUs = debt.direction === 'owed';

              return (
                <div
                  key={debt.id}
                  className={`bg-white rounded-2xl p-4 border shadow-sm transition ${
                    isClosed
                      ? 'border-slate-200/70 opacity-75'
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* Шапка карточки: иконка, название, кнопка редактирования */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                          isClosed
                            ? 'bg-emerald-500'
                            : isOwedToUs
                            ? 'bg-teal-600'
                            : 'bg-indigo-600'
                        }`}
                      >
                        {isClosed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Landmark className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {debt.name}
                          </h3>
                          {isClosed && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Закрыт
                            </span>
                          )}
                        </div>
                        {debt.note && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{debt.note}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditDebt(debt)}
                      title="Редактировать или удалить"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Крупно Остаток + Выплачено X ₸ из Y ₸ */}
                  <div className="mt-3.5 flex items-baseline justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-slate-500">Остаток: </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {percent}%
                    </span>
                  </div>

                  {/* Прогресс-бар погашения */}
                  <div className="mt-1.5 w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isClosed ? 'bg-emerald-500' : isOwedToUs ? 'bg-teal-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    Выплачено{' '}
                    <span className="font-semibold text-slate-800">{formatCurrency(paid)}</span> из{' '}
                    <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
                  </p>

                  {/* Подсказка ежемесячного платежа + кнопка «Внести платёж» */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {scheduleHint ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 min-w-0">
                        <CalendarClock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{scheduleHint}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {isClosed ? 'Полностью погашен' : 'График свободный'}
                      </span>
                    )}

                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => onPayDebt(debt)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition active:scale-95 ${
                          isOwedToUs
                            ? 'bg-emerald-600 hover:bg-emerald-500'
                            : 'bg-indigo-600 hover:bg-indigo-500'
                        }`}
                      >
                        {isOwedToUs ? (
                          <>
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            Получить возврат
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Внести платёж
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
