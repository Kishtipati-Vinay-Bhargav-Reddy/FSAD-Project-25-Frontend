import React from 'react';

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-5">
    <h2 className="font-display text-2xl text-white">{title}</h2>
    {subtitle ? <p className="mt-2 text-sm text-slate-200/70">{subtitle}</p> : null}
  </div>
);

export default SectionHeader;
