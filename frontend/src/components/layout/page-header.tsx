import type { ReactNode } from 'react';

type PageHeaderProps = {
  section: string;
  title: string;
  action?: ReactNode;
};

export function PageHeader({ section, title, action }: PageHeaderProps) {
  // Mantém a hierarquia do cabeçalho e permite que cada tela forneça ações opcionais.
  return (
    <header className="flex min-h-[54px] items-end justify-between max-md:min-h-12 max-md:items-start">
      <div>
        <p className="mb-[0.1rem] text-[0.72rem] font-medium text-muted-foreground">{section}</p>
        <h1 className="m-0 text-[1.45rem] font-semibold leading-[1.25] text-foreground max-md:text-xl">{title}</h1>
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </header>
  );
}