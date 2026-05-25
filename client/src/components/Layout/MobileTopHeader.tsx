interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function MobileTopHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between bg-zinc-50 px-5 pb-3 pt-4 dark:bg-zinc-950 md:hidden">
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] font-extrabold leading-none tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>
        {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
