import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const { pushToast } = useToast();
  const params = new URLSearchParams(location.search);

  const [form, setForm] = useState({
    email: '',
    password: '',
    roleHint: params.get('role') || 'student'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const loggedInUser = await login({ email: form.email, password: form.password });
      pushToast(`Welcome back, ${loggedInUser.name}!`, 'success');
      navigate(loggedInUser.role === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      pushToast(err?.response?.data?.error || 'Login failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-panel w-full max-w-lg p-8"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-slate-200/60">Secure access</p>
        <h1 className="font-display text-3xl text-white mt-3">Login to your dashboard</h1>
        <p className="text-sm text-slate-200/70 mt-2">
          {form.roleHint === 'teacher' ? 'Teacher portal access' : 'Student portal access'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-200/70">
          No account yet?{' '}
          <Link className="text-amber-200 hover:text-amber-100" to="/register">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
