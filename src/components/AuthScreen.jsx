import React, { useState } from 'react';
import { Wallet, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import {
  supabase,
  isSupabaseConfigured,
  INITIAL_FAMILY_MEMBERS,
} from '../lib/supabase';

export default function AuthScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Пожалуйста, укажите Email и пароль');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
        if (data?.session) {
          onLoginSuccess({
            type: 'supabase',
            session: data.session,
            email: data.session.user?.email || normalizedEmail,
          });
        }
      } else {
        // Локальный вход по одной из 5 семейных почт @tai.local (если .env ещё не заполнен)
        const matchedMember = INITIAL_FAMILY_MEMBERS.find(
          (m) => m.email.toLowerCase() === normalizedEmail
        );

        if (!matchedMember) {
          throw new Error(
            'Аккаунт не найден. Используйте семейный email (papa@tai.local, mama@tai.local, mansur@tai.local, alisher@tai.local, ahmad@tai.local).'
          );
        }

        onLoginSuccess({
          type: 'local',
          email: matchedMember.email,
        });
      }
    } catch (err) {
      setError(err.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center px-5 py-10">
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-slate-800/95 border border-slate-700/80 rounded-3xl p-7 shadow-2xl shadow-slate-950/60">
          {/* Шапка карточки в стиле современного мобильного банка */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/35 mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Tai Budget
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Семейный учёт финансов
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alisher@tai.local"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-900/90 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-900/90 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/30"
            >
              <span>{loading ? 'Вход...' : 'Войти'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
