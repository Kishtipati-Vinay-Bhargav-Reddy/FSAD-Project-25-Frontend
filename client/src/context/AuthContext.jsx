import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchProfile, loginUser, registerUser } from '../services/authService';

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'auth_user';

const persistUser = (user) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    if (!storedUser) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      if (!parsedUser?.email) {
        setLoading(false);
        return;
      }

      fetchProfile(parsedUser.email)
        .then((profile) => {
          setUser(profile);
          persistUser(profile);
        })
        .catch(() => {
          // Keep the stored user so refresh does not jump to another account.
        })
        .finally(() => setLoading(false));
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const login = async (payload) => {
    const data = await loginUser(payload);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    persistUser(data.user);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    await registerUser(payload);
    const userData = await loginUser({ email: payload.email, password: payload.password });
    localStorage.setItem(TOKEN_STORAGE_KEY, userData.token);
    persistUser(userData.user);
    setUser(userData.user);
    return userData.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
