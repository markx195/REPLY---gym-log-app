import { cn } from '@/lib/cn';

type CardVariant = 'elevated' | 'surface';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
};

const variantStyles: Record<CardVariant, string> = {
  elevated: 'bg-[var(--white)] shadow-[var(--shadow-md)]',
  surface: 'bg-[var(--surface)] shadow-[var(--shadow-sm)]',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  variant = 'elevated',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-xl)]',
        variantStyles[variant],
        paddingStyles[padding],
        interactive &&
          'cursor-pointer transition-transform duration-150 active:scale-[0.985]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
