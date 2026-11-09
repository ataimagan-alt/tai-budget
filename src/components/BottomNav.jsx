import React from 'react';
import { PieChart, Landmark, ReceiptText, Plus } from 'lucide-react';

const TABS = [
  { id: 'budget', label: 'Бюджет', icon: PieChart },
  { id: 'debts', label: 'Кредиты', icon: Landmark },
  { id: 'history', label: 'История', icon: ReceiptText },
];

function TabButton({ tab, isActive, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 h-14 rounded-2xl transition active:scale-95 ${
        isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
      <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
    </button>
  );
}

/**
 * Нижняя панель навигации: Бюджет | Кредиты | + | История
 */
export default function BottomNav({ activeTab, onTabChange, onAddClick }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-md mx-auto grid grid-cols-4 items-center px-3">
        <TabButton
          tab={TABS[0]}
          isActive={activeTab === TABS[0].id}
          onClick={() => onTabChange(TABS[0].id)}
        />

        <TabButton
          tab={TABS[1]}
          isActive={activeTab === TABS[1].id}
          onClick={() => onTabChange(TABS[1].id)}
        />

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onAddClick}
            aria-label="Новая операция"
            className="-mt-7 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center transition ring-4 ring-slate-100"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        <TabButton
          tab={TABS[2]}
          isActive={activeTab === TABS[2].id}
          onClick={() => onTabChange(TABS[2].id)}
        />
      </div>
    </nav>
  );
}
