import React from 'react';
import Loader from './Loader';
import { cn } from '@/lib/utils';

function Button({
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    ...props
}) {
    const variants = {
        primary: 'bg-primary text-primary-foreground hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
        danger: 'bg-destructive text-destructive-foreground hover:brightness-110',
    };

    const sizes = {
        sm: 'h-9 px-3 text-xs max-[350px]:h-8 max-[350px]:px-2.5 max-[350px]:text-[11px]',
        md: 'h-10 px-4 text-sm max-[350px]:h-9 max-[350px]:px-3 max-[350px]:text-xs',
        lg: 'h-11 px-6 text-sm max-[350px]:h-10 max-[350px]:px-4 max-[350px]:text-xs',
    };

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200',
                'max-[350px]:rounded-lg',
                'hover:shadow-sm active:scale-[0.99]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-60',
                variants[variant],
                sizes[size],
                className,
            )}
            {...props}
        >
            {loading ? <Loader size="sm" className="border-current border-t-transparent" /> : null}
            {children}
        </button>
    );
}

export default Button;
