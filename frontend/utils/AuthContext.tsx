// utils/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type AuthContextValue = {
  authHeader: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>; // 👈 async
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'bd_auth_v1';
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hora

type StoredAuth = {
  authHeader: string;
  expiresAt: number;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: StoredAuth = JSON.parse(raw);
      if (parsed.authHeader && parsed.expiresAt && parsed.expiresAt > Date.now()) {
        setAuthHeader(parsed.authHeader);
        setExpiresAt(parsed.expiresAt);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Error leyendo auth de localStorage', err);
    }
  }, []);

  const logout = () => {
    setAuthHeader(null);
    setExpiresAt(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
  };

  const login = async (username: string, password: string): Promise<void> => {
    const basic = 'Basic ' + btoa(`${username}:${password}`);

    // 1) Validar contra /auth/check
    let resp: Response;
    try {
      resp = await fetch(`${API_BASE_URL}/auth/check`, {
        method: 'GET',
        headers: {
          Authorization: basic,
        },
      });
    } catch (err) {
      console.error('Error llamando a /auth/check', err);
      throw new Error('No se ha podido contactar con el servidor.');
    }

    if (resp.status === 401) {
      throw new Error('Credenciales inválidas');
    }

    if (!resp.ok) {
      throw new Error(`No se ha podido validar las credenciales (status ${resp.status}).`);
    }

    // 2) Si hemos llegado aquí, las credenciales son válidas -> guardamos sesión
    const exp = Date.now() + SESSION_DURATION_MS;

    setAuthHeader(basic);
    setExpiresAt(exp);

    try {
      const toStore: StoredAuth = { authHeader: basic, expiresAt: exp };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (err) {
      console.error('Error guardando auth en localStorage', err);
    }
  };

  const isAuthenticated = !!authHeader && !!expiresAt && expiresAt > Date.now();

  const value: AuthContextValue = {
    authHeader: isAuthenticated ? authHeader : null,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return ctx;
}
