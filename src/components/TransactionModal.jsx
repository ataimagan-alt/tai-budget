import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  AlertCircle,
  MessageSquare,
  CalendarDays,
  Trash2,
} from 'lucide-react';
import BottomSheet from './ui/BottomSheet';
import AmountInput from './ui/AmountInput';
import MemberBadge from './ui/MemberBadge';
import { AccountIcon, CategoryIcon } from '../utils/icons';
import { formatCurrency, parseAmount, toLocalISODate } from '../utils/formatters';

const TRANSACTION_TYPES = [
  { id: 'expense', label: 'Расход', icon: ArrowUpRight, activeClass: 'bg-rose-600 text-white shadow-sm' },
  { id: 'income', label: 'Доход', icon: ArrowDownLeft, activeClass: 'bg-emerald-600 text-white shadow-sm' },
  { id: 'transfer', label: 'Перевод', icon: ArrowLeftRight, activeClass: 'bg-blue-600 text-white shadow-sm' },
];

function AccountPicker({ accounts, selectedId, onSelect, variant = 'dark' }) {
  const selectedClass =
    variant === 'blue'
      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
      : 'bg-slate-900 text-white border-slate-900 shadow-sm';

  return (
    <div className="grid grid-cols-3 gap-2">
      {accounts.map((acc) => {
        const isSelected = selectedId === acc.id;
        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onSelect(acc.id)}
            className={`p-2.5 rounded-2xl border text-left transition active:scale-95 ${
              isSelected ? selectedClass : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
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
            <p className={`text-[11px] mt-0.5 truncate ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
              {formatCurrency(acc.balance)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Окно создания и редактирования операции.
 * Если передан `transaction` — режим редактирования (с возможностью удаления).
 */
export default function TransactionModal({
  isOpen,
  onClose,
  transaction = null,
  accounts = [],
  categories = [],
  members = [],
  currentMember,
  onSave,
  onDelete,
}) {
  const isEdit = Boolean(transaction);

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toLocalISODate());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  // Инициализация формы при открытии (только по открытию / смене операции,
  // чтобы фоновое обновление данных не сбрасывало введённые значения)
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setConfirmDelete(false);
    setSaving(false);

    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount ?? ''));
      setCategoryId(transaction.category_id || '');
      setAccountId(transaction.account_id || '');
      setToAccountId(transaction.to_account_id || '');
      setNote(transaction.note || '');
      setDate(transaction.transaction_date || toLocalISODate());
      return;
    }

    const card = accounts.find((a) => a.type === 'card') || accounts[0];
    const other = accounts.find((a) => a.id !== card?.id);
    setType('expense');
    setAmount('');
    setCategoryId(categories.find((c) => c.type === 'expense')?.id || '');
    setAccountId(card?.id || '');
    setToAccountId(other?.id || '');
    setNote('');
    setDate(toLocalISODate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transaction?.id]);

  const filteredCategories = useMemo(
    () => (type === 'transfer' ? [] : categories.filter((c) => c.type === type)),
    [categories, type]
  );

  // Автор: при создании — вошедший пользователь, при редактировании — исходный автор
  const author = isEdit
    ? members.find((m) => String(m.id) === String(transaction.member_id)) || null
    : currentMember;

  const handleTypeChange = (newType) => {
    setType(newType);
    setError('');
    if (newType === 'transfer') return;

    const current = categories.find((c) => c.id === categoryId);
    if (!current || current.type !== newType) {
      setCategoryId(categories.find((c) => c.type === newType)?.id || '');
    }
    if (!toAccountId || toAccountId === accountId) {
      setToAccountId(accounts.find((a) => a.id !== accountId)?.id || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numericAmount = parseAmount(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Введите корректную сумму больше 0 ₸');
      return;
    }
    if (!accountId) {
      setError('Выберите счёт');
      return;
    }
    if (type !== 'transfer' && !categoryId) {
      setError('Выберите категорию');
      return;
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      setError('Выберите другой счёт зачисления');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        amount: numericAmount,
        type,
        category_id: type === 'transfer' ? null : categoryId,
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        member_id: isEdit ? transaction.member_id ?? null : currentMember?.id || null,
        note: note.trim() || null,
        transaction_date: date || toLocalISODate(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить операцию');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !transaction) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(transaction.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось удалить операцию');
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Редактирование операции' : 'Новая операция'}
      subtitle={
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Автор:</span>
          <MemberBadge member={author} />
        </div>
      }
    >
      {/* Переключатель типа: Расход / Доход / Перевод */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
        {TRANSACTION_TYPES.map((item) => {
          const Icon = item.icon;
          const isActive = type === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTypeChange(item.id)}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                isActive ? item.activeClass : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
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
        <AmountInput
          label="Сумма операции"
          value={amount}
          onChange={setAmount}
          autoFocus={!isEdit}
        />

        {/* Сетка категорий (для Расхода и Дохода) */}
        {type !== 'transfer' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Категория
            </label>
            {filteredCategories.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-2xl p-3 text-center">
                Нет категорий этого типа. Добавьте её на главном экране через «+ Категория».
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`relative flex flex-col items-center p-3 rounded-2xl border transition active:scale-95 ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm mb-1.5"
                        style={{ backgroundColor: cat.color || '#10B981' }}
                      >
                        <CategoryIcon name={cat.icon} className="w-5 h-5" />
                      </div>
                      <span className="min-h-[2.5em] flex items-center justify-center text-xs leading-tight">
                        <span className="font-semibold text-slate-800 line-clamp-2 text-center leading-tight">
                          {cat.name}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Счёт (по умолчанию — Основная карта) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            {type === 'transfer' ? 'Откуда (счёт списания)' : 'Счёт'}
          </label>
          <AccountPicker accounts={accounts} selectedId={accountId} onSelect={setAccountId} />
        </div>

        {type === 'transfer' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Куда (счёт зачисления)
            </label>
            <AccountPicker
              accounts={accounts}
              selectedId={toAccountId}
              onSelect={setToAccountId}
              variant="blue"
            />
          </div>
        )}

        {/* Дата и комментарий */}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="relative">
            <CalendarDays className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Дата операции"
              className="w-[9.5rem] pl-9 pr-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>
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

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition"
        >
          {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Сохранить'}
        </button>

        {/* Удаление ошибочной записи (только в режиме редактирования) */}
        {isEdit && onDelete && (
          confirmDelete ? (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="text-xs text-rose-700 text-center mb-2.5">
                Удалить операцию? Баланс счёта будет автоматически пересчитан.
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
              Удалить операцию
            </button>
          )
        )}
      </form>
    </BottomSheet>
  );
}
