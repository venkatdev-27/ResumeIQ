import React from 'react';
import { cn } from '@/lib/utils';

function Input({
    label,
    error,
    className = '',
    containerClassName = '',
    labelClassName = '',
    required = false,
    ...props
}) {
    return (
        <div className={cn('w-full', containerClassName)}>
            {label ? (
                <label className={cn('mb-1.5 block text-sm font-medium text-foreground max-[350px]:text-xs', labelClassName)}>
                    {label}
                    {required ? <span className="ml-1 text-destructive">*</span> : null}
                </label>
            ) : null}
            <input
                className={cn(
                    'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
                    'max-[350px]:rounded-lg max-[350px]:px-2.5 max-[350px]:py-1.5 max-[350px]:text-xs',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    error ? 'border-destructive focus-visible:ring-destructive/50' : '',
                    className,
                )}
                {...props}
            />
            {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        </div>
    );
}

export default Input;
