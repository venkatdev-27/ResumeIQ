import React from 'react';
import Button from '@/components/common/Button';
import { cn } from '@/lib/utils';

function JDInput({
    value,
    onChange,
    onFetchScore,
    onFetchSuggestions,
    scoreLoading = false,
    aiLoading = false,
    disabled = false,
    showSuggestionsButton = true,
    embedded = false,
    className = '',
}) {
    return (
        <div
            className={cn(
                'rounded-none border-0 bg-transparent p-0 shadow-none',
                !embedded && 'rounded-2xl border border-[#d5d9e1] bg-[#eceef2] p-4',
                className,
            )}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="min-w-0 text-[1.2rem] font-ui-heading font-bold text-[#111111] max-[350px]:text-[1rem]">Job Description (Optional)</h3>
                <span className="shrink-0 text-xs text-[#4b4b53] max-[350px]:text-[11px]">{value.length} chars</span>
            </div>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Paste job description only if you want AI improvement suggestions..."
                className="ats-mobile-field min-h-[150px] w-full resize-y rounded-xl border border-[#bec6d6] bg-[#eceef2] px-3 py-2 text-sm text-[#2e2e2e] placeholder:text-[#6b7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f67ff]/55 max-[350px]:min-h-[120px] max-[350px]:rounded-lg max-[350px]:px-2.5 max-[350px]:py-1.5 max-[350px]:text-xs"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button onClick={onFetchScore} loading={scoreLoading} disabled={disabled} size="sm" className="w-[170px]">
                    Check ATS Score
                </Button>
                {showSuggestionsButton ? (
                    <Button
                        variant="outline"
                        onClick={onFetchSuggestions}
                        loading={aiLoading}
                        disabled={disabled}
                        size="sm"
                        className="w-[170px]"
                    >
                        Get AI Improvements
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

export default JDInput;
