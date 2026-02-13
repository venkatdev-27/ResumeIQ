import React from 'react';
import Button from './Button';

function Modal({ isOpen, title, children, onClose }) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Close
                    </Button>
                </div>
                <div className="text-sm text-muted-foreground">{children}</div>
            </div>
        </div>
    );
}

export default Modal;
