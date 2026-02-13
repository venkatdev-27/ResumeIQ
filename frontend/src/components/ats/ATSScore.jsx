import React from 'react';
import { cn } from '@/lib/utils';
import {
    Progress,
    ProgressLabel,
    ProgressTrack,
    ProgressValue,
} from '@/components/animate-ui/components/base/progress';

function ATSScore({ score, status, error, embedded = false, className = '' }) {
    const [loadingProgress, setLoadingProgress] = React.useState(0);

    React.useEffect(() => {
        if (status !== 'loading') {
            setLoadingProgress(0);
            return undefined;
        }

        const timer = window.setInterval(() => {
            setLoadingProgress((prev) => {
                if (prev >= 95) {
                    return 95;
                }
                return prev + 20;
            });
        }, 450);

        return () => window.clearInterval(timer);
    }, [status]);

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
                {error || 'Unable to fetch ATS score.'}
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div
                className={cn(
                    'rounded-none border-0 bg-transparent p-0 shadow-none',
                    !embedded && 'rounded-2xl border border-[#d5d9e1] bg-[#eceef2] p-4',
                    className,
                )}
            >
                <h3 className="font-ui-heading text-[1.2rem] font-bold text-[#111111] max-[350px]:text-[1rem]">ATS Score</h3>
                <div className="mt-3">
                    <Progress value={loadingProgress} className="w-full space-y-2">
                        <div className="flex items-center justify-between gap-1">
                            <ProgressLabel>Analyzing resume</ProgressLabel>
                            <span className="text-sm text-[#4b4b53]">
                                <ProgressValue /> %
                            </span>
                        </div>
                        <ProgressTrack />
                    </Progress>
                </div>
            </div>
        );
    }

    const safeScore = Math.max(0, Math.min(100, Number(score || 0)));

    return (
        <div
            className={cn(
                'rounded-none border-0 bg-transparent p-0 shadow-none',
                !embedded && 'rounded-2xl border border-[#d5d9e1] bg-[#eceef2] p-4',
                className,
            )}
        >
            <h3 className="font-ui-heading text-[1.2rem] font-bold text-[#111111] max-[350px]:text-[1rem]">ATS Score</h3>
            <div className="mt-3">
                <Progress value={safeScore} className="w-full space-y-2">
                    <div className="flex items-center justify-between gap-1">
                        <ProgressLabel>Compatibility</ProgressLabel>
                        <span className="text-sm text-[#4b4b53]">
                            <ProgressValue /> %
                        </span>
                    </div>
                    <ProgressTrack />
                </Progress>
            </div>
        </div>
    );
}

export default ATSScore;
