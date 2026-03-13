import { PropsWithChildren } from 'react';
import clsx from 'clsx';

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx('rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg shadow-slate-200/60 backdrop-blur', className)}>
      {children}
    </div>
  );
}
