import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, MessageSquare, Trash2, CheckCircle2 } from 'lucide-react';
import BottomSheet from './ui/BottomSheet';
import AmountInput from './ui/AmountInput';
import { parseAmount } from '../utils/formatters';

const DIRECTIONS = [
  {
    id: 'owe',
    label: 'Кредиты и наши долги',
    activeClass: 'bg-rose-600 text-white shadow-sm',
  },
  {
    id: 'owed',
    label: 'Нам должны',
    activeClass: 'bg-emerald-600 text-white shadow-sm',
  },
];

/**
 * Модальное окно создания / редактирования кредита, рассрочки или долга.
 */
export default function DebtModal({
  isOpen,
  debt = null,
  defaultDirection = 'owe',
  onClose,
  onSave,
  onDelete,
}) {
  const isEdit = Boolean(debt);

  const [direction, setDirection] = useState('owe');
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [note, setNote] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSaving(false);
    setConfirmDelete(false);

    if (debt) {
      setDirection(debt.direction || 'owe');
      setName(debt.name || '');
      setTotalAmount(String(Number(debt.total_amount) || ''));
      setPaidAmount(String(Number(debt.paid_amount) || 0));
      setMonthlyPayment(debt.monthly_payment ? String(Number(debt.monthly_payment)) : '');
      setDueDay(debt.due_day ? String(debt.due_day) : '');
      setNote(debt.note || '');
      setIsClosed(Boolean(debt.is_closed));
    } else {
      setDirection(defaultDirection || 'owe');
      setName('');
      setTotalAmount('');
      setPaidAmount('0');
      setMonthlyPayment('');
      setDueDay('');
      setNote('');
      setIsClosed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, debt?.id, defaultDirection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const total = parseAmount(totalAmount);
    const paid = paidAmount === '' ? 0 : parseAmount(paidAmount);
    const monthly = monthlyPayment === '' ? null : parseAmount(monthlyPayment);
    const day = dueDay === '' ? null : Number(dueDay);

    if (!trimmedName) {
      setError('Укажите название кредита, рассрочки или долга');
      return;
    }
    if (!Number.isFinite(total) || total <= 0) {
      setError('Общая сумма должна быть больше 0 ₸');
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      setError('Уже выплаченная сумма не может быть отрицательной');
      return;
    }
    if (monthly !== null && (!Number.isFinite(monthly) || monthly < 0)) {
      setError('Укажите корректный ежемесячный платёж');
      return;
    }
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
      setError('День платежа должен быть числом от 1 до 31');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...(isEdit ? { id: debt.id } : {}),
        name: trimmedName,
        direction,
        total_amount: total,
        paid_amount: paid,
        monthly_payment: monthly && monthly > 0 ? monthly : null,
        due_day: day,
        note: note.trim() || null,
        is_closed: isEdit ? Boolean(isClosed || paid >= total) : paid >= total,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить запись');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !debt) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(debt.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось удалить запись');
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Редактирование кредита / долга' : 'Новый кредит или долг'}
    >
      {/* Переключатель: Кредиты и наши долги (owe) / Нам должны (owed) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
        {DIRECTIONS.map((item) => {
          const active = direction === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setDirection(item.id)}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition ${
                active ? item.activeClass : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Название
          </label>
          <input
            type="text"
            required
            autoFocus={!isEdit}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              direction === 'owe'
                ? 'Например: Рассрочка Kaspi или Кредит'
                : 'Например: Долг от соседа'
            }
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:font-normal placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <AmountInput
          label={direction === 'owe' ? 'Общая сумма кредита / долга' : 'Общая сумма долга нам'}
          value={totalAmount}
          onChange={setTotalAmount}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Уже выплачено (₸)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Платёж в месяц (₸)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              placeholder="Необязательно"
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:font-normal placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-[9.5rem_1fr] gap-2.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              День платежа
            </label>
            <div className="relative">
              <CalendarClock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="1–31 число"
                className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Заметка
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Комментарий (необязательно)"
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={() => setIsClosed((v) => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-semibold transition ${
              isClosed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <span>Статус кредита / долга</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {isClosed ? 'Закрыт (погашен)' : 'Активен'}
            </span>
          </button>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition"
        >
          {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Добавить'}
        </button>

        {isEdit && onDelete && (
          confirmDelete ? (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="text-xs text-rose-700 text-center mb-2.5">
                Удалить «{debt.name}» из списка кредитов и долгов?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                  className="py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="w-full py-3 rounded-2xl text-rose-600 hover:bg-rose-50 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-4 h-4" />
              Удалить запись
            </button>
          )
        )}
      </form>
    </BottomSheet>
  );
}
