import React, { useEffect, useRef, useState } from 'react';
import Loader from '@/components/common/Loader';
import { A4_HEIGHT, A4_WIDTH, hasMeaningfulResumeData, PREVIEW_RESUME_DATA, TEMPLATE_COMPONENT_MAP } from './templatePreviewConfig';

function TemplatePreviewModal({
    open,
    template,
    onClose,
    selectedTemplateId,
    onUseTemplate,
    actionLabel = 'Use Template',
    selectedActionLabel = 'Selected',
    useSelectedState = true,
    resumeData = null,
}) {
    const previewContainerRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const container = previewContainerRef.current;
        if (!container) {
            return undefined;
        }

        const updateScale = () => {
            const width = container.clientWidth;
            if (!width) {
                return;
            }

            const nextScale = Math.min(width / A4_WIDTH, 1);
            setScale((prev) => (Math.abs(prev - nextScale) < 0.005 ? prev : nextScale));
        };

        updateScale();

        const observer = new ResizeObserver(updateScale);
        observer.observe(container);

        return () => observer.disconnect();
    }, [open, template?.id]);

    useEffect(() => {
        if (!open) {
            setIsActionLoading(false);
        }
    }, [open, template?.id]);

    if (!open || !template) {
        return null;
    }

    const isSelected = selectedTemplateId === template.id;
    const SelectedTemplate = TEMPLATE_COMPONENT_MAP[template.id] || TEMPLATE_COMPONENT_MAP.template1;
    const previewData = hasMeaningfulResumeData(resumeData) ? resumeData : PREVIEW_RESUME_DATA;
    const primaryButtonLabel = useSelectedState && isSelected ? selectedActionLabel : actionLabel;
    const isStartAction = !useSelectedState && primaryButtonLabel.trim().toLowerCase() === 'start';
    const scaledWidth = Math.max(1, Math.round(A4_WIDTH * scale));
    const scaledHeight = Math.max(1, Math.round(A4_HEIGHT * scale));

    const handlePrimaryAction = async () => {
        if (isActionLoading) {
            return;
        }

        if (!isStartAction) {
            onUseTemplate(template.id);
            return;
        }

        setIsActionLoading(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 450));
            await Promise.resolve(onUseTemplate(template.id));
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-5">
            <button type="button" aria-label="Close preview overlay" className="absolute inset-0" onClick={onClose} />

            <div className="relative z-[71] flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 max-[350px]:px-3 max-[350px]:py-2.5">
                    <div>
                        <h3 className="text-base font-semibold text-foreground max-[350px]:text-sm">{template.name} Preview</h3>
                        <p className="text-xs text-muted-foreground">{template.tone}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary max-[350px]:h-8 max-[350px]:rounded-lg max-[350px]:px-2.5 max-[350px]:text-[11px]"
                    >
                        Close
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/30 p-2 max-[360px]:p-1.5 sm:p-6">
                    <div ref={previewContainerRef} className="mx-auto w-full max-w-[900px] overflow-hidden">
                        <article
                            className="mx-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                            style={{ width: scaledWidth, height: scaledHeight }}
                        >
                            <div
                                style={{
                                    width: A4_WIDTH,
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <SelectedTemplate resumeData={previewData} />
                            </div>
                        </article>
                    </div>
                </div>

                <div className="border-t border-border px-4 py-3">
                    <button
                        type="button"
                        onClick={handlePrimaryAction}
                        disabled={isActionLoading}
                        className={[
                            'w-full rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70',
                            isStartAction
                                ? 'h-12 rounded-full border border-[#e0b400] bg-[#facc15] text-base font-black tracking-wide text-slate-900'
                                : useSelectedState && isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'border border-border bg-background text-foreground hover:border-primary hover:text-primary',
                        ].join(' ')}
                    >
                        {isStartAction && isActionLoading ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <Loader size="sm" className="border-slate-900 border-t-transparent" />
                                Preparing Builder...
                            </span>
                        ) : (
                            primaryButtonLabel
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(TemplatePreviewModal);
