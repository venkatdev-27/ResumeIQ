'use client';
import * as React from 'react';

function getSystemEffective() {
    if (typeof window === 'undefined') {
        return 'light';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ThemeToggler({ theme, resolvedTheme, setTheme, onImmediateChange, children }) {
    const effective = theme || 'system';
    const resolved = effective === 'system' ? resolvedTheme || getSystemEffective() : effective;

    const toggleTheme = React.useCallback(
        (nextTheme) => {
            onImmediateChange?.(nextTheme);
            setTheme(nextTheme);
        },
        [onImmediateChange, setTheme],
    );

    return <>{typeof children === 'function' ? children({ effective, resolved, toggleTheme }) : children}</>;
}

export { ThemeToggler };
