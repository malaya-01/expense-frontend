type JournalPageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export function JournalPageHeader({ title, subtitle, children }: JournalPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="jrn-page-title">{title}</h1>
        {subtitle && <p className="jrn-page-subtitle mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
