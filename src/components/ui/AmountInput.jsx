import React from 'react';

/**
 * Крупное поле ввода суммы в ₸ без браузерных стрелочек.
 * Знак ₸ позиционирован абсолютно, поэтому поле всегда занимает всю ширину.
 */
export default function AmountInput({
  label = 'Сумма',
  value,
  onChange,
  autoFocus = false,
  allowNegative = false,
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 pt-3 pb-4 focus-within:border-blue-500 focus-within:bg-white transition">
      <label className="block text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={allowNegative ? undefined : '0'}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full px-10 text-center text-3xl font-bold text-slate-900 bg-transparent placeholder:text-slate-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400 pointer-events-none">
          ₸
        </span>
      </div>
    </div>
  );
}
