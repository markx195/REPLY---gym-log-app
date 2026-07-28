import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 font-medium tracking-[var(--tracking-normal)] transition-all duration-150 disabled:pointer-events-none disabled:opacity-40';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] hover:opacity-95 active:scale-[0.98]',
  secondary:
    'bg-[var(--surface)] text-[var(--black)] shadow-[var(--shadow-sm)] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--muted)] hover:text-[var(--black)] active:bg-[var(--surface)]',
  icon:
    'bg-[var(--surface)] text-[var(--black)] shadow-[var(--shadow-sm)] active:scale-[0.95]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[var(--text-sm)] rounded-[var(--radius-md)]',
  md: 'h-[var(--control-h-sm)] px-5 text-[var(--text-md)] rounded-[var(--radius-lg)]',
  lg: 'h-[var(--control-h)] px-6 text-[var(--text-lg)] rounded-[var(--radius-xl)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        base,
        variantStyles[variant],
        variant === 'icon'
          ? 'h-[var(--icon-btn)] w-[var(--icon-btn)] rounded-full p-0'
          : sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
