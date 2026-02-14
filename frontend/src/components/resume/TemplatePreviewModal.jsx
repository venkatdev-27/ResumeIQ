import React, { useEffect, useRef, useState } from 'react';
import Loader from '@/components/common/Loader';
import { A4_HEIGHT, A4_WIDTH, hasMeaningfulResumeData, PREVIEW_RESUME_DATA, TEMPLATE_COMPONENT_MAP } from './templatePreviewConfig';

const computeA4FitMetrics = (resumeElement) => {
    if (!resumeElement) {
        return { scale: 1, offsetX: 0 };
    }

    const contentWidth = Math.max(
        A4_WIDTH,
        Math.ceil(resumeElement.scrollWidth || 0),
        Math.ceil(resumeElement.offsetWidth || 0),
    );
    const contentHeight = Math.max(
        A4_HEIGHT,
        Math.ceil(resumeElement.scrollHeight || 0),
        Math.ceil(resumeElement.offsetHeight || 0),
    );

    const fitScale = Math.min(1, A4_WIDTH / contentWidth, A4_HEIGHT / contentHeight);
    const offsetX = Math.max(0, Math.floor((A4_WIDTH - contentWidth * fitScale) / 2));

    return {
        scale: Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1,
        offsetX,
    };
};

const TEMPLATE_LAYOUT_MAP = Object.freeze({
    template1: 'Row',
    template2: 'Column',
    template3: 'Column',
    template4: 'Column',
    template5: 'Row',
    template6: 'Column',
    template7: 'Row',
    template8: 'Row',
    template9: 'Column',
    template10: 'Row',
});

const getTemplateInsights = (templateId = '') => {
    const safeId = String(templateId || '').trim();
    const numericId = Number(safeId.replace(/[^0-9]/g, '')) || 1;
    const index = Math.max(numericId - 1, 0);
    const atsScore = (93 + index * 0.7).toFixed(1);
    const layoutMode = TEMPLATE_LAYOUT_MAP[safeId] || 'Row';

    return [
        `ATS Resume Score: ${atsScore}+`,
        `Layout: ${layoutMode}`,
        'Download PDF: One-click export ready',
    ];
};

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
    showTemplateInsights = false,
}) {
    const previewContainerRef = useRef(null);
    const previewPageRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [contentFitScale, setContentFitScale] = useState(1);
    const [contentOffsetX, setContentOffsetX] = useState(0);
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
            setContentFitScale(1);
            setContentOffsetX(0);
        }
    }, [open, template?.id]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const pageRoot = previewPageRef.current;
        const resumeElement = pageRoot?.querySelector('#resume-pdf');
        if (!resumeElement) {
            setContentFitScale(1);
            setContentOffsetX(0);
            return undefined;
        }

        let frameId = null;

        const updateMetrics = () => {
            const metrics = computeA4FitMetrics(resumeElement);
            setContentFitScale((prev) => (Math.abs(prev - metrics.scale) < 0.005 ? prev : metrics.scale));
            setContentOffsetX((prev) => (Math.abs(prev - metrics.offsetX) < 1 ? prev : metrics.offsetX));
        };

        const scheduleUpdate = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(updateMetrics);
        };

        scheduleUpdate();

        const observer = new ResizeObserver(scheduleUpdate);
        observer.observe(resumeElement);

        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
        };
    }, [open, template?.id, resumeData]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalBodyOverflow = document.body.style.overflow;

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        return () => {
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.body.style.overflow = originalBodyOverflow;
        };
    }, [open]);

    if (!open || !template) {
        return null;
    }

    const isSelected = selectedTemplateId === template.id;
    const SelectedTemplate = TEMPLATE_COMPONENT_MAP[template.id] || TEMPLATE_COMPONENT_MAP.template1;
    const previewData = hasMeaningfulResumeData(resumeData) ? resumeData : PREVIEW_RESUME_DATA;
    const primaryButtonLabel = useSelectedState && isSelected ? selectedActionLabel : actionLabel;
    const isStartAction = !useSelectedState && primaryButtonLabel.trim().toLowerCase() === 'start';
    const templateInsights = showTemplateInsights ? getTemplateInsights(template.id) : [];
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

            <div className="relative z-[71] flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:h-[96vh] sm:max-h-[96vh]">
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

                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/30 p-2 pb-3 max-[360px]:p-1.5 sm:p-6">
                    <div ref={previewContainerRef} className="mx-auto w-full max-w-[900px] overflow-hidden">
                        <article
                            className="mx-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                            style={{ width: scaledWidth, height: scaledHeight }}
                        >
                            <div
                                style={{
                                    width: A4_WIDTH,
                                    height: A4_HEIGHT,
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <div ref={previewPageRef} className="w-[794px]">
                                    <div
                                        style={{
                                            width: A4_WIDTH,
                                            transform: `translateX(${contentOffsetX}px) scale(${contentFitScale})`,
                                            transformOrigin: 'top left',
                                        }}
                                    >
                                        <SelectedTemplate resumeData={previewData} />
                                    </div>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>

                <div className="border-t border-border px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
                    {templateInsights.length ? (
                        <div className="mb-3 overflow-hidden rounded-xl border border-emerald-200 bg-[#f8fdf9]">
                            {templateInsights.map((line, index) => (
                                <div
                                    key={`${template.id}-insight-${index}`}
                                    className={`flex items-center gap-2 px-3 py-2 ${
                                        index % 2 === 0 ? 'bg-[#eefaf1]' : 'bg-[#f8fdf9]'
                                    }`}
                                >
                                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                                        {'\u2713'}
                                    </span>
                                    <p className="text-xs font-medium text-[#14532d]">{line}</p>
                                </div>
                            ))}
                        </div>
                    ) : null}

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
