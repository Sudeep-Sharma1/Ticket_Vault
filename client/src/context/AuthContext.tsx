import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  quickSwitchUser: (role: UserRole) => Promise<void>;
  isAdmin: boolean;
  isOrganiser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ticket_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        console.error('Failed to fetch user session:', err);
        localStorage.removeItem('ticket_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('ticket_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'CUSTOMER') => {
    const res = await api.register({ name, email, password, role });
    localStorage.setItem('ticket_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('ticket_token');
    setToken(null);
    setUser(null);
  };

  // Demo shortcut to switch personas instantly
  const quickSwitchUser = async (role: UserRole) => {
    let email = 'customer@example.com';
    let pass = 'password123';
    if (role === 'ORGANISER') {
      email = 'organiser@events.com';
      pass = 'password123';
    } else if (role === 'ADMIN') {
      email = 'admin@tickets.com';
      pass = 'admin123';
    }
    await login(email, pass);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isOrganiser = user?.role === 'ORGANISER' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        quickSwitchUser,
        isAdmin,
        isOrganiser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
