import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-[background,color,box-shadow,transform] duration-150 select-none disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper shadow-lift hover:bg-[#2a3060]',
  secondary: 'bg-white text-ink ring-1 ring-line hover:ring-ink/30 shadow-[0_1px_2px_rgb(28_33_71/0.05)]',
  ghost: 'text-ink-soft hover:text-ink hover:bg-ink/5',
  danger: 'bg-danger text-white hover:bg-[#9b2b40]',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-14 px-7 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      <span>{children}</span>
    </button>
  );
});
