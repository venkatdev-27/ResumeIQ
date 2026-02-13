import React from 'react';
import { cn } from '@/lib/utils';

function Loader({ size = 'md', className = '' }) {
    const sizeClass = {
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-9 w-9 border-[3px]',
    }[size];

    return (
        <span
            className={cn(
                'inline-block animate-spin rounded-full border-primary border-t-transparent',
                sizeClass,
                className,
            )}
            aria-label="Loading"
        />
    );
}

export default Loader;
