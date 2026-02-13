import { useEffect, useRef } from 'react';

function useAutosave(value, onSave, options = {}) {
    const { delay = 1000, enabled = true } = options;
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (!enabled || typeof onSave !== 'function') {
            return undefined;
        }

        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onSave(value);
        }, delay);

        return () => clearTimeout(timeoutRef.current);
    }, [value, onSave, delay, enabled]);
}

export default useAutosave;
