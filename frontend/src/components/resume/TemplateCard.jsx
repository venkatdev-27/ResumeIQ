import React from 'react';

const cardToneMap = {
    template1: { accent: 'bg-sky-500/25', chip: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
    template2: { accent: 'bg-indigo-500/25', chip: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
    template3: { accent: 'bg-emerald-500/25', chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
    template4: { accent: 'bg-amber-500/25', chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
    template5: { accent: 'bg-rose-500/25', chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
    template6: { accent: 'bg-cyan-500/25', chip: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' },
    template7: { accent: 'bg-fuchsia-500/25', chip: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300' },
    template8: { accent: 'bg-lime-500/25', chip: 'bg-lime-500/15 text-lime-700 dark:text-lime-300' },
    template9: { accent: 'bg-slate-500/25', chip: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
    template10: { accent: 'bg-blue-600/25', chip: 'bg-blue-600/15 text-blue-700 dark:text-blue-300' },
};

function TemplateCard({ template, isSelected, onPreview, onUse, disabled = false }) {
    const tone = cardToneMap[template.id] || cardToneMap.template1;

    const handleUse = (event) => {
        event.stopPropagation();
        if (disabled) {
            return;
        }
        onUse(template.id);
    };

    const handleCardClick = () => {
        if (disabled) {
            return;
        }
        onPreview(template);
    };

    const handleKeyDown = (event) => {
        if (disabled) {
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPreview(template);
        }
    };

    return (
        <article
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className={[
                'group cursor-pointer rounded-2xl border bg-card p-3 shadow-sm transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                isSelected ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-primary/45 hover:shadow-md',
                disabled ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
        >
            <div className="mb-3 rounded-xl border border-border/80 bg-background p-2">
                <div className="space-y-1.5 rounded-lg bg-card p-2">
                    <div className={`h-2.5 w-1/2 rounded ${tone.accent}`} />
                    <div className="grid gap-1.5 sm:grid-cols-[32%_1fr]">
                        <div className="space-y-1">
                            <div className="h-2 rounded bg-muted" />
                            <div className="h-2 rounded bg-muted/80" />
                            <div className="h-2 rounded bg-muted/70" />
                            <div className="h-2 rounded bg-muted/60" />
                        </div>
                        <div className="space-y-1">
                            <div className="h-2 rounded bg-muted" />
                            <div className="h-2 rounded bg-muted/85" />
                            <div className="h-2 rounded bg-muted/75" />
                            <div className="h-2 rounded bg-muted/65" />
                            <div className="h-2 rounded bg-muted/55" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                    <h4 className="text-sm font-semibold text-foreground">{template.name}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">{template.tone}</p>
                </div>
                {template.atsSafe ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.chip}`}>ATS Safe</span> : null}
            </div>

            <button
                type="button"
                onClick={handleUse}
                disabled={disabled}
                className={[
                    'inline-flex h-8 items-center justify-center rounded-xl px-3 text-xs font-semibold transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
                    'max-[350px]:h-7 max-[350px]:rounded-lg max-[350px]:px-2.5 max-[350px]:text-[11px]',
                    isSelected
                        ? 'bg-primary text-primary-foreground hover:brightness-110'
                        : 'border border-border bg-background text-foreground hover:border-primary hover:text-primary',
                ].join(' ')}
            >
                Use Template
            </button>
        </article>
    );
}

export default React.memo(TemplateCard);


