import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/[0.05] mb-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        {description && <p className="text-zinc-500 text-sm mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
