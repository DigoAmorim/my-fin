import type { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'small' | 'icon';
};

const variantClasses = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground',
  ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  danger: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
};

const sizeClasses = {
  default: 'h-9 gap-2 rounded-lg px-5 py-2 text-sm font-medium has-[>svg]:px-4',
  small: 'h-8 gap-1.5 rounded-lg px-3 text-sm font-medium',
  icon: 'size-[30px] gap-2 rounded-md p-0 text-[0.78rem] font-semibold leading-none',
};

export function Button({
  children,
  className = '',
  type = 'button',
  variant = 'primary',
  size = 'default',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}