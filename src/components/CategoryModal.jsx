import React, { useEffect, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import BottomSheet from './ui/BottomSheet';
import AmountInput from './ui/AmountInput';
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from '../utils/icons';
import { formatCurrency, parseAmount } from '../utils/formatters';

const COLOR_OPTIONS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
];

/**
 * Создание новой категории или изменение существующего конверта (в т.ч. месячного лимита).
 */
export default function CategoryModal({ isOpen, category = null, spentThisMonth = 0, onClose, onSave }) {
  const isEdit = Boolean(category);

  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [budget, setBudget] = useState('');
  const [icon, setIcon] = useState('shopping-bag');
  const [color, setColor] = useState(COLOR_OPTIONS[5]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSaving(false);
    setName(category?.name || '');
    setType(category?.type || 'expense');
    setBudget(category ? String(Number(category.monthly_budget) || 0) : '');
    setIcon(category?.icon || 'shopping-bag');
    setColor(category?.color || COLOR_OPTIONS[5]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, category?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const numericBudget = type === 'expense' ? parseAmount(budget || 0) : 0;

    if (!trimmedName) {
      setError('Введите название категории');
      return;
    }
    if (!Number.isFinite(numericBudget) || numericBudget < 0) {
      setError('Лимит должен быть числом не меньше 0');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...(isEdit ? { id: category.id } : {}),
        name: trimmedName,
        type,
        monthly_budget: numericBudget,
        icon,
        color,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить категорию');
      setSaving(false);
    }
  };

  const numericBudgetPreview = parseAmount(budget || 0) || 0;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Конверт «${category.name}»` : 'Новая категория'}
      subtitle={
        isEdit && type === 'expense' ? (
          <p className="text-xs text-slate-500">
            Потрачено в этом месяце:{' '}
            <span className="font-semibold text-slate-700">{formatCurrency(spentThisMonth)}</span>
          </p>
        ) : null
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Тип категории — только при создании */}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {[
              { id: 'expense', label: 'Расход (конверт)', active: 'bg-rose-600 text-white shadow-sm' },
              { id: 'income', label: 'Доход', active: 'bg-emerald-600 text-white shadow-sm' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition ${
                  type === item.id ? item.active : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Превью + название */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: color }}
          >
            <CategoryIcon name={icon} className="w-6 h-6" />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название, например «Образование»"
            autoFocus={!isEdit}
            className="flex-1 min-w-0 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:font-normal placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        {/* Месячный лимит конверта */}
        {type === 'expense' && (
          <div>
            <AmountInput
              label="Месячный лимит конверта"
              value={budget}
              onChange={setBudget}
              autoFocus={isEdit}
            />
            {isEdit && (
              <p className="text-xs text-center mt-1.5 text-slate-500">
                Остаток после изменения:{' '}
                <span
                  className={`font-semibold ${
                    numericBudgetPreview - spentThisMonth < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(numericBudgetPreview - spentThisMonth)}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Иконка */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Иконка
          </label>
          <div className="grid grid-cols-7 gap-1.5">
            {CATEGORY_ICON_OPTIONS.map((key) => {
              const isSelected = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={key}
                  className={`aspect-square rounded-xl flex items-center justify-center transition active:scale-95 ${
                    isSelected ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                >
                  <CategoryIcon name={key} className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Цвет */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Цвет
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 ${
                  color === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                }`}
                style={{ backgroundColor: c }}
              >
                {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition"
        >
          {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать категорию'}
        </button>
      </form>
    </BottomSheet>
  );
}
