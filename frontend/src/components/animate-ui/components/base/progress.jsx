import * as React from 'react';
import { cn } from '@/lib/utils';

const ProgressContext = React.createContext({ value: 0 });

const clampValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    return Math.max(0, Math.min(100, numeric));
};

export const Progress = ({ value = 0, className = '', children, ...props }) => {
    const safeValue = clampValue(value);

    return (
        <ProgressContext.Provider value={{ value: safeValue }}>
            <div className={cn('w-full', className)} {...props}>
                {children}
            </div>
        </ProgressContext.Provider>
    );
};

export const ProgressLabel = ({ className = '', children, ...props }) => (
    <span className={cn('text-sm font-medium text-[#111111]', className)} {...props}>
        {children}
    </span>
);

export const ProgressValue = ({ className = '', ...props }) => {
    const { value } = React.useContext(ProgressContext);
    return (
        <span className={cn('font-semibold text-[#111111]', className)} {...props}>
            {Math.round(value)}
        </span>
    );
};

export const ProgressTrack = ({ className = '', indicatorClassName = '', ...props }) => {
    const { value } = React.useContext(ProgressContext);

    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(value)}
            className={cn('h-3 overflow-hidden rounded-full bg-[#d9deea] max-[350px]:h-2.5', className)}
            {...props}
        >
            <div
                className={cn('h-full rounded-full bg-[#375cf6] transition-[width] duration-500 ease-out', indicatorClassName)}
                style={{ width: `${value}%` }}
            />
        </div>
    );
};

