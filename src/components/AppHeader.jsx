import React from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Wallet, LogOut } from 'lucide-react';
import { formatMonthYear } from '../utils/formatters';

/**
 * Общая шапка для вкладок «Бюджет» и «История»:
 * логотип, бейдж вошедшего участника, обновление, выход и переключатель месяцев.
 * Содержимое вкладки (сводная плашка) передаётся через children.
 */
export default function AppHeader({
  subtitle,
  currentMember,
  userEmail,
  loading,
  onRefresh,
  onSignOut,
  selectedYear,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onResetToCurrentMonth,
  children,
}) {
  const badgeName = currentMember?.name || userEmail?.split('@')[0] || '';
  const badgeColor = currentMember?.color || '#64748B';

  return (
    <header
      className="bg-slate-900 text-white pb-6 px-4 rounded-b-[2rem] shadow-lg"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
    >
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight">Tai Budget</h1>
              <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {badgeName && (
              <div className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: badgeColor }}
                >
                  {badgeName.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-slate-100 max-w-[5.5rem] truncate">
                  {badgeName}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Обновить данные"
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onSignOut}
              title="Выйти из аккаунта"
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-rose-400 transition active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Переключатель месяцев: ◀ Ноябрь 2026 ▶ */}
        <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/80 rounded-2xl p-1.5 mb-5">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Предыдущий месяц"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/70 active:scale-95 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onResetToCurrentMonth}
            title="Вернуться к текущему месяцу"
            className="px-4 py-1.5 rounded-xl hover:bg-slate-700/40 transition text-base font-bold tracking-wide text-white"
          >
            {formatMonthYear(selectedYear, selectedMonth)}
          </button>

          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Следующий месяц"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/70 active:scale-95 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </header>
  );
}
