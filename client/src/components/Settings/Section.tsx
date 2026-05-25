import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface SectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

export default function Section({ title, icon: Icon, children }: SectionProps): React.ReactElement {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)', marginBottom: 24 }}
    >
      <div className="flex items-center gap-2 border-b px-6 py-4" style={{ borderColor: 'var(--border-secondary)' }}>
        <Icon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}
