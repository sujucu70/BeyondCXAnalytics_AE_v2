// components/LoginPage.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../utils/AuthContext';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Introduce usuario y contraseña');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password); 
      toast.success('Sesión iniciada');
    } catch (err) {
      console.error('Error en login', err);
      const msg =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-sky-500 to-slate-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/95 rounded-3xl shadow-2xl p-8 space-y-6"
      >
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 mb-1">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Beyond Diagnostic
          </h1>
          <p className="text-sm text-slate-500">
            Inicia sesión para acceder al análisis
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Usuario
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                autoComplete="username"
                className="block w-full rounded-2xl border border-slate-200 pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                autoComplete="current-password"
                className="block w-full rounded-2xl border border-slate-200 pl-9 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center rounded-2xl bg-indigo-600 text-white text-sm font-medium py-2.5 shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-[11px] text-slate-400 text-center mt-2">
            La sesión permanecerá activa durante 1 hora.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
