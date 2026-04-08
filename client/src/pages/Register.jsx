import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const newUser = await register(form);
      pushToast(`Welcome, ${newUser.name}!`, 'success');
      navigate(newUser.role === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      pushToast(err?.response?.data?.error || 'Registration failed.', 'error');
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
        className="glass-panel w-full max-w-xl p-8"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-slate-200/60">Join the portal</p>
        <h1 className="font-display text-3xl text-white mt-3">Create your account</h1>
        <p className="text-sm text-slate-200/70 mt-2">Pick your role and start managing assignments.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input-field"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="input-field"
              placeholder="jane@example.com"
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
              minLength={6}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Role</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {['student', 'teacher'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, role }))}
                  className={
                    form.role === role
                      ? 'btn-pill btn-pill-active'
                      : 'btn-pill'
                  }
                >
                  {role === 'student' ? 'Student' : 'Teacher'}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-200/70">
          Already have an account?{' '}
          <Link className="text-amber-200 hover:text-amber-100" to="/login">
            Login here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
