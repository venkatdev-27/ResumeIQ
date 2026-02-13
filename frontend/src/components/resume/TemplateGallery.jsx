import React, { useEffect, useMemo, useState } from 'react';
import TemplateCard from './TemplateCard';
import TemplatePreviewModal from './TemplatePreviewModal';

function LoadingGrid() {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
                <div key={`template-skeleton-${index}`} className="animate-pulse rounded-2xl border border-border bg-card p-3">
                    <div className="mb-3 h-28 rounded-xl bg-muted" />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                    <div className="mt-3 h-8 w-24 rounded-xl bg-muted" />
                </div>
            ))}
        </div>
    );
}

const getCardsPerView = (width) => {
    if (width <= 350) {
        return 1;
    }
    if (width < 768) {
        return 1;
    }
    if (width < 1024) {
        return 2;
    }
    if (width < 1280) {
        return 3;
    }
    return 4;
};

function TemplateGallery({ templates, selectedTemplate, onSelectTemplate, disabled = false }) {
    const [previewTemplate, setPreviewTemplate] = useState(null);
    const [cardsPerView, setCardsPerView] = useState(() =>
        typeof window !== 'undefined' ? getCardsPerView(window.innerWidth) : 4,
    );
    const [slideIndex, setSlideIndex] = useState(0);

    const normalizedTemplates = useMemo(
        () =>
            (templates || []).map((template, index) => ({
                ...template,
                atsSafe: index % 2 === 0 || index === 9,
            })),
        [templates],
    );
    const maxIndex = Math.max(normalizedTemplates.length - cardsPerView, 0);
    const slidePages = Math.max(maxIndex + 1, 1);

    useEffect(() => {
        const onResize = () => {
            setCardsPerView(getCardsPerView(window.innerWidth));
        };

        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        setSlideIndex((prev) => Math.min(prev, maxIndex));
    }, [maxIndex]);

    useEffect(() => {
        if (!selectedTemplate) {
            return;
        }
        const selectedIndex = normalizedTemplates.findIndex((item) => item.id === selectedTemplate);
        if (selectedIndex === -1) {
            return;
        }

        setSlideIndex((prev) => {
            if (selectedIndex < prev) {
                return selectedIndex;
            }
            if (selectedIndex > prev + cardsPerView - 1) {
                return Math.max(0, selectedIndex - cardsPerView + 1);
            }
            return prev;
        });
    }, [selectedTemplate, normalizedTemplates, cardsPerView]);

    const handlePreview = (template) => {
        if (disabled) {
            return;
        }
        onSelectTemplate(template.id);
        setPreviewTemplate(template);
    };

    const handleUseTemplate = (templateId) => {
        if (disabled) {
            return;
        }
        onSelectTemplate(templateId);
    };

    const goPrev = () => {
        setSlideIndex((prev) => Math.max(prev - 1, 0));
    };

    const goNext = () => {
        setSlideIndex((prev) => Math.min(prev + 1, maxIndex));
    };

    if (!Array.isArray(templates) || templates.length === 0) {
        return (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm max-[350px]:rounded-xl max-[350px]:p-3">
                <div className="mb-3">
                    <h3 className="text-base font-semibold text-foreground max-[350px]:text-sm">Template Gallery</h3>
                    <p className="text-xs text-muted-foreground max-[350px]:text-[11px]">Loading template previews...</p>
                </div>
                <LoadingGrid />
            </section>
        );
    }

    return (
        <>
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm max-[350px]:rounded-xl max-[350px]:p-3">
                <div className="mb-3">
                    <h3 className="text-base font-semibold text-foreground max-[350px]:text-sm">Template Gallery</h3>
                    <p className="text-xs text-muted-foreground max-[350px]:text-[11px]">
                        Click any template card to open full preview, then choose your template.
                    </p>
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={disabled || slideIndex <= 0}
                        className="absolute left-1 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/90 bg-background/90 text-xs text-foreground shadow-sm backdrop-blur transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 max-[350px]:h-7 max-[350px]:w-7 max-[350px]:text-[11px]"
                        aria-label="Previous templates"
                    >
                        {'<'}
                    </button>

                    <div className="overflow-hidden px-11 max-[350px]:px-9">
                        <div
                            className="flex transition-transform duration-300 ease-out"
                            style={{
                                transform: `translateX(-${slideIndex * (100 / cardsPerView)}%)`,
                            }}
                        >
                            {normalizedTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className="shrink-0 px-1.5"
                                    style={{
                                        width: `${100 / cardsPerView}%`,
                                    }}
                                >
                                    <TemplateCard
                                        template={template}
                                        isSelected={selectedTemplate === template.id}
                                        onPreview={handlePreview}
                                        onUse={handleUseTemplate}
                                        disabled={disabled}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={goNext}
                        disabled={disabled || slideIndex >= maxIndex}
                        className="absolute right-1 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/90 bg-background/90 text-xs text-foreground shadow-sm backdrop-blur transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 max-[350px]:h-7 max-[350px]:w-7 max-[350px]:text-[11px]"
                        aria-label="Next templates"
                    >
                        {'>'}
                    </button>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2">
                    {Array.from({ length: slidePages }).map((_, index) => (
                        <button
                            key={`template-slide-${index}`}
                            type="button"
                            onClick={() => setSlideIndex(index)}
                            disabled={disabled}
                            className={`rounded-full transition-all duration-300 ${
                                slideIndex === index ? 'h-2 w-5 bg-primary' : 'h-2 w-2 bg-foreground/30 hover:bg-foreground/50'
                            }`}
                            aria-label={`Go to template slide ${index + 1}`}
                        />
                    ))}
                </div>

                {!selectedTemplate ? (
                    <div className="mt-3 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                        No template selected. Choose a template to continue.
                    </div>
                ) : null}
            </section>

            <TemplatePreviewModal
                open={Boolean(previewTemplate)}
                template={previewTemplate}
                onClose={() => setPreviewTemplate(null)}
                selectedTemplateId={selectedTemplate}
                onUseTemplate={handleUseTemplate}
            />
        </>
    );
}

export default React.memo(TemplateGallery);


