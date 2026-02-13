import React from 'react';
import { cn } from '@/lib/utils';

function AISuggestions({
    suggestions = [],
    improvedResume = null,
    status = 'idle',
    error = null,
    embedded = false,
    className = '',
}) {
    if (status === 'idle') {
        return null;
    }

    if (status === 'failed') {
        return (
            <div
                className={cn(
                    'rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive',
                    embedded && 'rounded-none border-0 bg-transparent p-0',
                    className,
                )}
            >
                {error || 'Unable to fetch AI suggestions.'}
            </div>
        );
    }

    const hasData = Boolean(
        improvedResume &&
            (improvedResume.summary ||
                (improvedResume.workExperience || []).length ||
                (improvedResume.projects || []).length ||
                (improvedResume.internships || []).length ||
                (improvedResume.skills || []).length ||
                (improvedResume.atsFeedback?.missingKeywords || []).length ||
                (improvedResume.atsFeedback?.missingSkills || []).length),
    );

    return (
        <div
            className={cn(
                'rounded-none border-0 bg-transparent p-0 shadow-none',
                !embedded && 'rounded-2xl border border-[#d5d9e1] bg-[#eceef2] p-4',
                className,
            )}
        >
            <h3 className="font-ui-heading text-[1.2rem] font-bold text-[#111111] max-[350px]:text-[1rem]">AI Resume Improvement</h3>
            {status === 'loading' ? <p className="mt-2 text-sm text-[#4b4b53]">Generating suggestions...</p> : null}

            {status === 'succeeded' ? (
                hasData ? (
                    <div className="mt-3 space-y-3">
                        {improvedResume.summary ? (
                            <div className={cn('rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
                                <h4 className="mb-1 text-sm font-semibold text-[#111111] max-[350px]:text-xs">Improved Summary</h4>
                                <p className="text-sm text-[#4b4b53] max-[350px]:text-xs">{improvedResume.summary}</p>
                            </div>
                        ) : null}

                        {(improvedResume.skills || []).length ? (
                            <div className={cn('rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
                                <h4 className="mb-2 text-sm font-semibold text-[#111111] max-[350px]:text-xs">Optimized Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {improvedResume.skills.map((item, index) => (
                                        <span
                                            key={`ai-skill-${item}-${index}`}
                                            className="rounded-full bg-[#dfe6ff] px-2.5 py-1 text-xs text-[#2f52e8] max-[350px]:px-2 max-[350px]:py-0.5 max-[350px]:text-[11px]"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {(improvedResume.atsFeedback?.whyScoreIsLower || []).length ? (
                            <div className={cn('rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
                                <h4 className="mb-2 text-sm font-semibold text-[#111111] max-[350px]:text-xs">Why Score Is Lower</h4>
                                <ul className="list-inside list-disc space-y-1 text-xs text-[#4b4b53] max-[350px]:text-[11px]">
                                    {improvedResume.atsFeedback.whyScoreIsLower.map((item, index) => (
                                        <li key={`lower-${index}`}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {(improvedResume.atsFeedback?.missingKeywords || []).length ? (
                            <div className={cn('rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
                                <h4 className="mb-2 text-sm font-semibold text-[#111111] max-[350px]:text-xs">Missing Keywords</h4>
                                <div className="flex flex-wrap gap-2">
                                    {improvedResume.atsFeedback.missingKeywords.map((item, index) => (
                                        <span
                                            key={`missing-keyword-${item}-${index}`}
                                            className="rounded-full bg-[#f6c6cc] px-2.5 py-1 text-xs text-[#8a1d2b] max-[350px]:px-2 max-[350px]:py-0.5 max-[350px]:text-[11px]"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {(improvedResume.atsFeedback?.missingSkills || []).length ? (
                            <div className={cn('rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
                                <h4 className="mb-2 text-sm font-semibold text-[#111111] max-[350px]:text-xs">Missing Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {improvedResume.atsFeedback.missingSkills.map((item, index) => (
                                        <span
                                            key={`missing-skill-${item}-${index}`}
                                            className="rounded-full bg-[#ffe7bf] px-2.5 py-1 text-xs text-[#8a5600] max-[350px]:px-2 max-[350px]:py-0.5 max-[350px]:text-[11px]"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {(improvedResume.atsFeedback?.improvementSteps || []).length ? (
                            <div className={cn('rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
                                <h4 className="mb-2 text-sm font-semibold text-[#111111] max-[350px]:text-xs">Improvement Steps</h4>
                                <ul className="list-inside list-disc space-y-1 text-xs text-[#4b4b53] max-[350px]:text-[11px]">
                                    {improvedResume.atsFeedback.improvementSteps.map((item, index) => (
                                        <li key={`step-${index}`}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                ) : suggestions.length ? (
                    <ul className="mt-3 space-y-2">
                        {suggestions.map((item) => (
                            <li
                                key={item.id}
                                className={cn(
                                    'rounded-none border-0 bg-transparent px-0 py-0 text-sm text-[#4b4b53] max-[350px]:text-xs',
                                    !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] px-3 py-2',
                                )}
                            >
                                {item.text}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-2 text-sm text-[#4b4b53]">No suggestions returned by AI.</p>
                )
            ) : null}
        </div>
    );
}

export default AISuggestions;
