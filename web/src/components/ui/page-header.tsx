import { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="glass-panel rounded-[2rem] px-8 py-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-blue-600">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
