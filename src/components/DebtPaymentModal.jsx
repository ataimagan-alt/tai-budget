import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CalendarDays, MessageSquare } from 'lucide-react';
import BottomSheet from './ui/BottomSheet';
import AmountInput from './ui/AmountInput';
import MemberBadge from './ui/MemberBadge';
import { AccountIcon } from '../utils/icons';
import { formatCurrency, parseAmount, toLocalISODate } from '../utils/formatters';

/**
 * Компактное модальное окно «Внести платёж» по кредиту / долгу.
 * По умолчанию подставляет monthly_payment (или остаток долга) и счёт «Основная карта».
 */
export default function DebtPaymentModal({
  isOpen,
  debt = null,
  accounts = [],
  currentMember,
  onClose,
  onPay,
}) {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toLocalISODate());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const remaining = debt
    ? Math.max(0, Number(debt.total_amount || 0) - Number(debt.paid_amount || 0))
    : 0;
  const monthly = debt && Number(debt.monthly_payment) > 0 ? Number(debt.monthly_payment) : 0;

  useEffect(() => {
    if (!isOpen || !debt) return;
    setError('');
    setSaving(false);

    const defaultAmount =
      monthly > 0 && remaining > 0 ? Math.min(monthly, remaining) : remaining || monthly || '';
    setAmount(defaultAmount ? String(defaultAmount) : '');

    const card = accounts.find((a) => a.type === 'card') || accounts[0];
    setAccountId(card?.id || '');
    setNote(
      debt.direction === 'owed' ? `Возврат долга: ${debt.name}` : `Платёж: ${debt.name}`
    );
    setDate(toLocalISODate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, debt?.id]);

  if (!debt) return null;

  const isOwedToUs = debt.direction === 'owed';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseAmount(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Введите сумму платежа больше 0 ₸');
      return;
    }
    if (!accountId) {
      setError('Выберите счёт');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onPay({
        debt,
        amount: numericAmount,
        accountId,
        memberId: currentMember?.id || null,
        note,
        date,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось провести платёж');
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isOwedToUs ? 'Получить возврат долга' : 'Внести платёж'}
      subtitle={
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{debt.name}</span>
          <span>• Остаток: {formatCurrency(remaining)}</span>
          {currentMember && (
            <span className="inline-flex items-center gap-1">
              • <MemberBadge member={currentMember} />
            </span>
          )}
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <AmountInput label="Сумма платежа" value={amount} onChange={setAmount} autoFocus />

          {/* Быстрые кнопки подстановки ежемесячного платежа или всего остатка */}
          {(monthly > 0 || remaining > 0) && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {monthly > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(monthly))}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                >
                  Платёж: {formatCurrency(monthly)}
                </button>
              )}
              {remaining > 0 && remaining !== monthly && (
                <button
                  type="button"
                  onClick={() => setAmount(String(remaining))}
                  className="px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition"
                >
                  Весь остаток: {formatCurrency(remaining)}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Выбор счёта */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            {isOwedToUs ? 'На какой счёт зачислить' : 'С какого счёта списать'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {accounts.map((acc) => {
              const isSelected = accountId === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={`p-2.5 rounded-2xl border text-left transition active:scale-95 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <AccountIcon
                      type={acc.type}
                      className={`w-4 h-4 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}
                    />
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <p className="text-xs font-semibold leading-tight line-clamp-2">{acc.name}</p>
                  <p
                    className={`text-[11px] mt-0.5 truncate ${
                      isSelected ? 'text-white/70' : 'text-slate-500'
                    }`}
                  >
                    {formatCurrency(acc.balance)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Дата и комментарий */}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="relative">
            <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Дата платежа"
              className="w-[9.5rem] pl-9 pr-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
          <div className="relative">
            <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Комментарий"
              className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition"
        >
          {saving
            ? 'Проведение платежа...'
            : isOwedToUs
            ? 'Подтвердить возврат долга'
            : 'Подтвердить платёж'}
        </button>
      </form>
    </BottomSheet>
  );
}
