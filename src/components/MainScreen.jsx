import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import BudgetView from './BudgetView';
import DebtsView from './DebtsView';
import HistoryView from './HistoryView';
import BottomNav from './BottomNav';
import TransactionModal from './TransactionModal';
import AccountBalanceModal from './AccountBalanceModal';
import CategoryModal from './CategoryModal';
import DebtModal from './DebtModal';
import DebtPaymentModal from './DebtPaymentModal';

/**
 * Основной экран после входа: вкладки «Бюджет» / «Кредиты» / «История», нижняя навигация и все модальные окна.
 */
export default function MainScreen({ data, currentMember, userEmail, period, onSignOut }) {
  const {
    members,
    accounts,
    categories,
    debts,
    transactions,
    loading,
    error,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setAccountBalance,
    saveCategory,
    saveDebt,
    deleteDebt,
    payDebt,
  } = data;

  const [activeTab, setActiveTab] = useState('budget');
  const [txModal, setTxModal] = useState({ open: false, transaction: null });
  const [accountModal, setAccountModal] = useState(null); // выбранный счёт
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [debtModal, setDebtModal] = useState({ open: false, debt: null, defaultDirection: 'owe' });
  const [debtPaymentModal, setDebtPaymentModal] = useState({ open: false, debt: null });
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Автоматически скрываем уведомление
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const spentByCategory = useMemo(() => {
    const map = {};
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.category_id) {
        map[tx.category_id] = (map[tx.category_id] || 0) + Number(tx.amount || 0);
      }
    }
    return map;
  }, [transactions]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const handleSaveTransaction = useCallback(
    async (payload) => {
      if (txModal.transaction) {
        await updateTransaction(txModal.transaction.id, payload);
        setToast({ type: 'success', text: 'Операция обновлена' });
      } else {
        await addTransaction(payload);
        setToast({ type: 'success', text: 'Операция сохранена' });
      }
    },
    [txModal.transaction, updateTransaction, addTransaction]
  );

  const handleDeleteTransaction = useCallback(
    async (id) => {
      await deleteTransaction(id);
      setToast({ type: 'success', text: 'Операция удалена, баланс пересчитан' });
    },
    [deleteTransaction]
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      // xlsx (~300 КБ) загружается только при первом экспорте
      const { exportTransactionsToExcel } = await import('../utils/exportExcel');
      const fileName = await exportTransactionsToExcel({
        transactions,
        members,
        categories,
        accounts,
        year: period.year,
        month: period.month,
      });
      setToast({ type: 'success', text: `Файл ${fileName} готов` });
    } catch (err) {
      // Пользователь закрыл окно «Поделиться» — это не ошибка
      if (!/cancel/i.test(err?.message || '')) {
        setToast({ type: 'error', text: `Не удалось сформировать файл: ${err.message}` });
      }
    } finally {
      setExporting(false);
    }
  };

  const headerProps = {
    currentMember,
    userEmail,
    loading,
    onRefresh: refresh,
    onSignOut,
    selectedYear: period.year,
    selectedMonth: period.month,
    onPrevMonth: period.onPrev,
    onNextMonth: period.onNext,
    onResetToCurrentMonth: period.onReset,
  };

  const closeTxModal = useCallback(() => setTxModal({ open: false, transaction: null }), []);
  const closeAccountModal = useCallback(() => setAccountModal(null), []);
  const closeCategoryModal = useCallback(() => setCategoryModal({ open: false, category: null }), []);
  const closeDebtModal = useCallback(
    () => setDebtModal({ open: false, debt: null, defaultDirection: 'owe' }),
    []
  );
  const closeDebtPaymentModal = useCallback(() => setDebtPaymentModal({ open: false, debt: null }), []);

  return (
    <div className="min-h-screen bg-slate-100 pb-32">
      {error && (
        <div className="bg-amber-500 text-slate-950 text-xs font-medium px-4 py-2 text-center">{error}</div>
      )}

      {activeTab === 'budget' && (
        <BudgetView
          headerProps={headerProps}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          spentByCategory={spentByCategory}
          onAccountClick={(account) => setAccountModal(account)}
          onCategoryClick={(category) => setCategoryModal({ open: true, category })}
          onAddCategory={() => setCategoryModal({ open: true, category: null })}
        />
      )}

      {activeTab === 'debts' && (
        <DebtsView
          headerProps={headerProps}
          debts={debts}
          onAddDebt={(direction) =>
            setDebtModal({ open: true, debt: null, defaultDirection: direction || 'owe' })
          }
          onEditDebt={(debt) =>
            setDebtModal({ open: true, debt, defaultDirection: debt.direction || 'owe' })
          }
          onPayDebt={(debt) => setDebtPaymentModal({ open: true, debt })}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView
          headerProps={headerProps}
          transactions={transactions}
          members={members}
          categories={categories}
          accounts={accounts}
          onTransactionClick={(transaction) => setTxModal({ open: true, transaction })}
          onExport={handleExport}
          exporting={exporting}
        />
      )}

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddClick={() => setTxModal({ open: true, transaction: null })}
      />

      <TransactionModal
        isOpen={txModal.open}
        transaction={txModal.transaction}
        onClose={closeTxModal}
        accounts={accounts}
        categories={categories}
        members={members}
        currentMember={currentMember}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />

      <AccountBalanceModal
        isOpen={Boolean(accountModal)}
        account={accountModal}
        onClose={closeAccountModal}
        onSave={async (accountId, balance) => {
          await setAccountBalance(accountId, balance);
          setToast({ type: 'success', text: 'Баланс счёта обновлён' });
        }}
      />

      <CategoryModal
        isOpen={categoryModal.open}
        category={categoryModal.category}
        spentThisMonth={categoryModal.category ? spentByCategory[categoryModal.category.id] || 0 : 0}
        onClose={closeCategoryModal}
        onSave={async (category) => {
          await saveCategory(category);
          setToast({ type: 'success', text: category.id ? 'Категория обновлена' : 'Категория создана' });
        }}
      />

      <DebtModal
        isOpen={debtModal.open}
        debt={debtModal.debt}
        defaultDirection={debtModal.defaultDirection}
        onClose={closeDebtModal}
        onSave={async (debt) => {
          await saveDebt(debt);
          setToast({
            type: 'success',
            text: debt.id ? 'Кредит / долг обновлён' : 'Кредит / долг добавлен',
          });
        }}
        onDelete={async (id) => {
          await deleteDebt(id);
          setToast({ type: 'success', text: 'Запись удалена' });
        }}
      />

      <DebtPaymentModal
        isOpen={debtPaymentModal.open}
        debt={debtPaymentModal.debt}
        accounts={accounts}
        currentMember={currentMember}
        onClose={closeDebtPaymentModal}
        onPay={async (paymentPayload) => {
          await payDebt(paymentPayload);
          const nextPaid =
            Number(paymentPayload.debt.paid_amount || 0) + Number(paymentPayload.amount || 0);
          const isClosedNow = nextPaid >= Number(paymentPayload.debt.total_amount || 0);
          setToast({
            type: 'success',
            text: isClosedNow
              ? `«${paymentPayload.debt.name}» полностью погашен!`
              : 'Платёж проведён и добавлен в историю',
          });
        }}
      />

      {/* Всплывающее уведомление */}
      {toast && (
        <div className="fixed left-0 right-0 bottom-28 z-[60] flex justify-center px-4 pointer-events-none">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-sm font-medium text-white ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
