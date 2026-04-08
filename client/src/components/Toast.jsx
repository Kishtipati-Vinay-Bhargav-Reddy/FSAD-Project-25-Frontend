import React from 'react';
import { useToast } from '../context/ToastContext';

const toastStyles = {
  info: 'bg-slate-900/90 text-white border-white/10',
  success: 'bg-emerald-500/90 text-white border-emerald-200/40',
  error: 'bg-rose-500/90 text-white border-rose-200/40'
};

const Toast = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed right-6 top-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${toastStyles[toast.type] || toastStyles.info}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;
