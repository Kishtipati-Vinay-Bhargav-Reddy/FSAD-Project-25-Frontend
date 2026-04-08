import React from 'react';

const StatCard = ({ label, value, hint }) => (
  <div className="glass-panel p-5">
    <p className="text-sm uppercase tracking-[0.2em] text-slate-200/70">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    {hint ? <p className="mt-2 text-xs text-slate-200/60">{hint}</p> : null}
  </div>
);

export default StatCard;
