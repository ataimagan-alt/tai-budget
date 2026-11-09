import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured, STORAGE_KEYS, resolveMemberByEmail } from './lib/supabase';
import { useBudgetData } from './hooks/useBudgetData';
import AuthScreen from './components/AuthScreen';
import MainScreen from './components/MainScreen';

export default function App() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Сессия Supabase или локальная сессия по @tai.local
  const [session, setSession] = useState(null);
  const [localEmail, setLocalEmail] = useState(
    () => localStorage.getItem(STORAGE_KEYS.LOCAL_SESSION_EMAIL) || ''
  );
  const [authChecking, setAuthChecking] = useState(isSupabaseConfigured);

  // Проверка сессии Supabase при старте
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthChecking(false);
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
      setAuthChecking(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  // Email текущего вошедшего пользователя
  const activeEmail = isSupabaseConfigured ? session?.user?.email || '' : localEmail;

  const data = useBudgetData({
    enabled: Boolean(activeEmail),
    year: selectedYear,
    month: selectedMonth,
  });

  // Активный участник семьи определяется автоматически по email
  const currentMember = useMemo(
    () => resolveMemberByEmail(data.members, activeEmail),
    [data.members, activeEmail]
  );

  const handleLoginSuccess = ({ type, session: newSession, email }) => {
    if (type === 'supabase' && newSession) {
      setSession(newSession);
    } else if (email) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_SESSION_EMAIL, email);
      setLocalEmail(email);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase && session) {
      await supabase.auth.signOut();
      setSession(null);
    }
    localStorage.removeItem(STORAGE_KEYS.LOCAL_SESSION_EMAIL);
    setLocalEmail('');
  };

  const period = {
    year: selectedYear,
    month: selectedMonth,
    onPrev: () => {
      if (selectedMonth === 0) {
        setSelectedYear((y) => y - 1);
        setSelectedMonth(11);
      } else {
        setSelectedMonth((m) => m - 1);
      }
    },
    onNext: () => {
      if (selectedMonth === 11) {
        setSelectedYear((y) => y + 1);
        setSelectedMonth(0);
      } else {
        setSelectedMonth((m) => m + 1);
      }
    },
    onReset: () => {
      const current = new Date();
      setSelectedYear(current.getFullYear());
      setSelectedMonth(current.getMonth());
    },
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Загрузка Tai Budget...</p>
        </div>
      </div>
    );
  }

  if (!activeEmail) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <MainScreen
      data={data}
      currentMember={currentMember}
      userEmail={activeEmail}
      period={period}
      onSignOut={handleSignOut}
    />
  );
}
