import React from 'react';
import { cn } from '@/lib/utils';

function KeywordList({ title, list, colorClass, embedded = false }) {
    return (
        <div className={cn('space-y-2 rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
            <h4 className="mb-2 text-sm font-semibold text-[#111111] max-[350px]:text-xs">{title}</h4>
            {list.length ? (
                <div className="flex flex-wrap gap-2">
                    {list.map((item) => (
                        <span
                            key={`${title}-${item}`}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium max-[350px]:px-2 max-[350px]:py-0.5 max-[350px]:text-[11px] ${colorClass}`}
                        >
                            {item}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-[#4b4b53] max-[350px]:text-[11px]">No data available.</p>
            )}
        </div>
    );
}

function KeywordSuggestions({ matchedKeywords = [], missingKeywords = [], missingSkills = [], recommendations = [], embedded = false, className = '' }) {
    if (!matchedKeywords.length && !missingKeywords.length && !missingSkills.length && !recommendations.length) {
        return null;
    }

    return (
        <div
            className={cn(
                'space-y-4 rounded-none border-0 bg-transparent p-0 shadow-none',
                !embedded && 'rounded-2xl border border-[#d5d9e1] bg-[#eceef2] p-4',
                className,
            )}
        >
            <h3 className="font-ui-heading text-[1.2rem] font-bold text-[#111111] max-[350px]:text-[1rem]">Keyword Insights</h3>
            <KeywordList
                title="Matched Keywords"
                list={matchedKeywords}
                embedded={embedded}
                colorClass="bg-emerald-500/15 text-emerald-700"
            />
            <KeywordList
                title="Missing Words (Summary/Experience/Projects/Internships)"
                list={missingKeywords}
                embedded={embedded}
                colorClass="bg-amber-500/15 text-amber-700"
            />
            <KeywordList
                title="Missing Skills"
                list={missingSkills}
                embedded={embedded}
                colorClass="bg-rose-500/15 text-rose-700"
            />
            <div className={cn('rounded-none border-0 bg-transparent p-0', !embedded && 'rounded-xl border border-[#d5d9e1] bg-[#eceef2] p-3')}>
                <h4 className="mb-2 text-sm font-semibold text-[#111111] max-[350px]:text-xs">Recommendations</h4>
                {recommendations.length ? (
                    <ul className="list-inside list-disc space-y-1 text-xs text-[#4b4b53] max-[350px]:text-[11px]">
                        {recommendations.map((item) => (
                            <li key={`recommendation-${item}`}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-[#4b4b53] max-[350px]:text-[11px]">No recommendations yet.</p>
                )}
            </div>
        </div>
    );
}

export default KeywordSuggestions;
