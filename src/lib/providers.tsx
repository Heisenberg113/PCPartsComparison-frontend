'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, createContext, useContext, useEffect, type ReactNode } from 'react';

// =================== React Query Provider ===================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// =================== Auth Context ===================
interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  isLoggedIn: boolean;
  isHydrated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoggedIn: false,
  isHydrated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsHydrated(true);
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: AuthUser) => {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!token, isHydrated }}>
      {children}
    </AuthContext.Provider>
  );
}

// =================== Compare Context ===================
interface CompareContextType {
  compareIds: number[];
  compareCategory: string | null;
  addToCompare: (id: number, category: string) => void;
  removeFromCompare: (id: number) => void;
  clearCompare: () => void;
  isInCompare: (id: number) => boolean;
  canAddToCompare: (category: string) => boolean;
}

const CompareContext = createContext<CompareContextType>({
  compareIds: [],
  compareCategory: null,
  addToCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  isInCompare: () => false,
  canAddToCompare: () => true,
});

export function useCompare() {
  return useContext(CompareContext);
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareCategory, setCompareCategory] = useState<string | null>(null);

  // Load từ localStorage sau khi mount (tránh hydration mismatch)
  useEffect(() => {
    try {
      const savedIds = localStorage.getItem('compare_ids');
      const savedCategory = localStorage.getItem('compare_category');
      if (savedIds) {
        const ids = JSON.parse(savedIds) as number[];
        if (Array.isArray(ids) && ids.length > 0) {
          setCompareIds(ids);
          setCompareCategory(savedCategory);
        }
      }
    } catch {}
  }, []);

  // Sync sang localStorage mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem('compare_ids', JSON.stringify(compareIds));
    if (compareCategory) localStorage.setItem('compare_category', compareCategory);
    else localStorage.removeItem('compare_category');
  }, [compareIds, compareCategory]);

  const addToCompare = (id: number, category: string) => {
    setCompareIds((prev) => {
      if (prev.length >= 4 || prev.includes(id)) return prev;
      if (prev.length === 0) setCompareCategory(category);
      return [...prev, id];
    });
  };

  const removeFromCompare = (id: number) => {
    setCompareIds((prev) => {
      const next = prev.filter((i) => i !== id);
      if (next.length === 0) setCompareCategory(null);
      return next;
    });
  };

  const clearCompare = () => { setCompareIds([]); setCompareCategory(null); };
  const isInCompare = (id: number) => compareIds.includes(id);
  const canAddToCompare = (category: string) =>
    compareIds.length === 0 || category === compareCategory;

  return (
    <CompareContext.Provider value={{ compareIds, compareCategory, addToCompare, removeFromCompare, clearCompare, isInCompare, canAddToCompare }}>
      {children}
    </CompareContext.Provider>
  );
}
