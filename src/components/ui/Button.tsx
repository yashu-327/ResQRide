import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'emergency' | 'warning' | 'success' | 'primary' | 'secondary' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]';

  const variantClasses = {
    emergency:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm border border-red-700',
    warning:
      'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm border border-amber-700',
    success:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm border border-emerald-700',
    primary:
      'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-sm border border-slate-800',
    secondary:
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm',
    subtle:
      'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-transparent',
  };

  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5 rounded-lg min-h-[38px] gap-1.5',
    md: 'text-base px-4 py-2.5 rounded-xl min-h-[46px] gap-2',
    lg: 'text-lg px-5 py-3.5 rounded-xl min-h-[54px] gap-3 font-semibold',
    xl: 'text-xl px-6 py-4 rounded-2xl min-h-[64px] gap-3.5 font-bold tracking-tight',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
