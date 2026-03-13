'use client';

import { PropsWithChildren } from 'react';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  onClose: () => void;
}>) {
  return (
    <div className="web-modal-backdrop" onClick={onClose}>
      <div className="web-modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[2rem] border-b border-slate-100 bg-white/96 px-8 py-6 backdrop-blur">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-blue-500">Gestion</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-3"
          >
            Fermer
          </button>
        </div>
        <div className="px-8 py-7">{children}</div>
      </div>
    </div>
  );
}

