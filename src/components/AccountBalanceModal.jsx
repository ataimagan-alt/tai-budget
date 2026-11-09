import React, { useEffect, useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import BottomSheet from './ui/BottomSheet';
import AmountInput from './ui/AmountInput';
import { AccountIcon } from '../utils/icons';
import { formatCurrency, parseAmount } from '../utils/formatters';

/**
 * Быстрая корректировка текущего баланса счёта (без создания операции).
 */
export default function AccountBalanceModal({ isOpen, account, onClose, onSave }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && account) {
      setValue(String(Number(account.balance) || 0));
      setError('');
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, account?.id]);

  if (!account) return null;

  const currentBalance = Number(account.balance) || 0;
  const parsed = parseAmount(value);
  const difference = Number.isFinite(parsed) ? parsed - currentBalance : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Number.isFinite(parsed) || String(value).trim() === '') {
      setError('Введите корректную сумму');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(account.id, parsed);
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось обновить баланс');
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Баланс счёта"
      subtitle={
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <AccountIcon type={account.type} className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-700">{account.name}</span>
          <span>• сейчас {formatCurrency(currentBalance)}</span>
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
        <AmountInput label="Фактический баланс" value={value} onChange={setValue} autoFocus allowNegative />

        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-slate-500">Корректировка</span>
          <span
            className={`font-bold ${
              difference > 0 ? 'text-emerald-600' : difference < 0 ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            {difference > 0 ? '+' : ''}
            {formatCurrency(difference)}
          </span>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-2xl bg-slate-50 text-[11px] text-slate-500 leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-slate-400" />
          <span>
            Баланс меняется напрямую и не попадает в историю операций. Используйте это для сверки с
            реальным остатком на карте или в кошельке.
          </span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition"
        >
          {saving ? 'Сохранение...' : 'Сохранить баланс'}
        </button>
      </form>
    </BottomSheet>
  );
}
