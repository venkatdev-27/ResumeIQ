import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'motion/react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/common/Button';
import {
    Progress,
    ProgressLabel,
    ProgressTrack,
    ProgressValue,
} from '@/components/animate-ui/components/base/progress';
import AISuggestions from '@/components/ai/AISuggestions';
import { fetchATSScore } from '@/redux/atsSlice';
import { clearAISuggestions, fetchAISuggestions } from '@/redux/aiSlice';
import { ROUTES } from '@/utils/constants';
import { resumeFormToText } from '@/utils/helpers';

const dedupeStrings = (values = []) => {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
        .map((item) => String(item || '').trim())
        .filter((item) => {
            if (!item) {
                return false;
            }
            const key = item.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
};

const getScoreTone = (score) => {
    if (score >= 85) {
        return { stroke: '#16a34a', ring: '#dcfce7', label: 'Strong' };
    }
    if (score >= 65) {
        return { stroke: '#375cf6', ring: '#dbe4ff', label: 'Good' };
    }
    return { stroke: '#d97706', ring: '#ffedd5', label: 'Needs Work' };
};

function ATSResults() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { uploadedText, resumeId, form } = useSelector((state) => state.resume);
    const ats = useSelector((state) => state.ats);
    const ai = useSelector((state) => state.ai);

    const [jobDescription, setJobDescription] = React.useState(() => String(location.state?.jobDescription || ''));
    const [loadingProgress, setLoadingProgress] = React.useState(0);
    const [aiLoadingProgress, setAiLoadingProgress] = React.useState(0);
    const [animatedScore, setAnimatedScore] = React.useState(0);
    const [isNarrowViewport, setIsNarrowViewport] = React.useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 360 : false,
    );
    const hasRequestedRef = React.useRef(false);

    const hasResumeContent = React.useMemo(() => {
        const formText = resumeFormToText(form);
        return Boolean(resumeId || String(uploadedText || '').trim() || String(formText || '').trim());
    }, [resumeId, uploadedText, form]);

    const runAtsOnMount = Boolean(location.state?.runAts);
    const safeScore = Math.max(0, Math.min(100, Number(ats.score || 0)));
    const tone = getScoreTone(safeScore);

    const showLoadingState = ats.status === 'loading' || (runAtsOnMount && !hasRequestedRef.current && ats.status === 'idle');

    const missingSkills = dedupeStrings(ats.missingSkills || []);
    const missingKeywords = dedupeStrings(ats.missingKeywords || []);

    React.useEffect(() => {
        if (!hasResumeContent || hasRequestedRef.current) {
            return;
        }

        const shouldFetch = runAtsOnMount || ats.status === 'idle';
        if (!shouldFetch) {
            return;
        }

        hasRequestedRef.current = true;
        dispatch(clearAISuggestions());
        dispatch(fetchATSScore({ jobDescription }));
    }, [dispatch, hasResumeContent, runAtsOnMount, ats.status]);

    React.useEffect(() => {
        if (ats.status !== 'loading') {
            setLoadingProgress(0);
            return undefined;
        }

        setLoadingProgress(0);
        const timer = window.setInterval(() => {
            setLoadingProgress((prev) => {
                if (prev >= 92) {
                    return 92;
                }
                return prev + 8;
            });
        }, 260);

        return () => window.clearInterval(timer);
    }, [ats.status]);

    React.useEffect(() => {
        if (ai.status !== 'loading') {
            setAiLoadingProgress(0);
            return undefined;
        }

        setAiLoadingProgress(0);
        const timer = window.setInterval(() => {
            setAiLoadingProgress((prev) => {
                if (prev >= 92) {
                    return 92;
                }
                return prev + 7;
            });
        }, 240);

        return () => window.clearInterval(timer);
    }, [ai.status]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleResize = () => {
            setIsNarrowViewport(window.innerWidth < 360);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    React.useEffect(() => {
        if (ats.status !== 'succeeded') {
            setAnimatedScore(0);
            return undefined;
        }

        const durationMs = 950;
        const startTime = performance.now();
        let frameId = null;

        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            setAnimatedScore(Math.round(safeScore * progress));

            if (progress < 1) {
                frameId = window.requestAnimationFrame(tick);
            }
        };

        frameId = window.requestAnimationFrame(tick);

        return () => {
            if (frameId) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, [ats.status, safeScore]);

    const handleRunATSAgain = async () => {
        dispatch(clearAISuggestions());
        await dispatch(fetchATSScore({ jobDescription }));
    };

    const handleFetchAI = async () => {
        const atsAction = await dispatch(fetchATSScore({ jobDescription }));
        if (!fetchATSScore.fulfilled.match(atsAction)) {
            return;
        }

        await dispatch(
            fetchAISuggestions({
                jobDescription,
                atsContext: atsAction.payload,
            }),
        );
    };

    if (!hasResumeContent) {
        return (
            <div className="min-h-screen overflow-x-hidden bg-[#f1f2f4] text-[#2e2e2e]">
                <Navbar />
                <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
                    <section className="border-b border-[#d5d9e1] pb-6">
                        <h2 className="font-ui-heading text-[1.6rem] font-bold text-[#111111] sm:text-[1.8rem]">No Resume Context Found</h2>
                        <p className="mt-2 text-sm text-[#4b4b53]">
                            Upload your resume first, then check ATS score.
                        </p>
                        <Link to={ROUTES.atsScanner} className="mt-4 inline-flex">
                            <Button size="sm">Go To ATS Scanner</Button>
                        </Link>
                    </section>
                </main>
                <Footer />
            </div>
        );
    }

    const size = isNarrowViewport ? 170 : 220;
    const strokeWidth = isNarrowViewport ? 11 : 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeOffset = circumference - (safeScore / 100) * circumference;

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#f1f2f4] text-[#2e2e2e]">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl space-y-6 px-3 py-5 sm:px-6 lg:px-8">
                <section className="border-b border-[#d5d9e1] pb-4 sm:pb-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="font-ui-heading text-[1.65rem] font-extrabold leading-tight text-[#111111] sm:text-[1.95rem]">
                                ATS Analysis Result
                            </h1>
                            <p className="mt-1 max-w-3xl text-sm text-[#4b4b53]">
                                Score, missing skills, missing vocabulary words, and AI-powered improvements from your uploaded resume.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.atsScanner)}>
                            Back
                        </Button>
                    </div>
                </section>

                {showLoadingState ? (
                    <section className="border-b border-[#d5d9e1] pb-5">
                        <div className="mx-auto max-w-2xl space-y-4">
                            <Progress value={loadingProgress} className="w-full space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <ProgressLabel className="min-w-0 break-words text-xs sm:text-sm">Analyzing ATS score</ProgressLabel>
                                    <span className="text-sm text-[#4b4b53]">
                                        <ProgressValue /> %
                                    </span>
                                </div>
                                <ProgressTrack />
                            </Progress>
                            <div className="flex items-center gap-2 text-sm text-[#4b4b53]">
                                <motion.span
                                    className="inline-flex h-2.5 w-2.5 rounded-full bg-[#375cf6]"
                                    animate={{ opacity: [0.35, 1, 0.35] }}
                                    transition={{ duration: 1.1, repeat: Infinity }}
                                />
                                <span>Scanning sections, skills coverage, and keyword alignment...</span>
                            </div>
                        </div>
                    </section>
                ) : null}

                {ats.status === 'failed' ? (
                    <section className="border-b border-[#f1b8c0] pb-5 text-sm text-destructive">
                        <p>{ats.error || 'Unable to fetch ATS score.'}</p>
                        <div className="mt-3">
                            <Button size="sm" onClick={handleRunATSAgain}>
                                Retry ATS Check
                            </Button>
                        </div>
                    </section>
                ) : null}

                {ats.status === 'succeeded' ? (
                    <>
                        <section className="grid gap-5 border-b border-[#d5d9e1] pb-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                            <article className="min-w-0">
                                <h3 className="font-ui-heading text-[1.25rem] font-bold text-[#111111]">ATS Score</h3>
                                <div className="mt-3 flex justify-center lg:justify-start">
                                    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
                                        <svg width={size} height={size} className="-rotate-90">
                                            <circle
                                                cx={size / 2}
                                                cy={size / 2}
                                                r={radius}
                                                fill="none"
                                                stroke={tone.ring}
                                                strokeWidth={strokeWidth}
                                            />
                                            <motion.circle
                                                cx={size / 2}
                                                cy={size / 2}
                                                r={radius}
                                                fill="none"
                                                stroke={tone.stroke}
                                                strokeWidth={strokeWidth}
                                                strokeLinecap="round"
                                                strokeDasharray={circumference}
                                                initial={{ strokeDashoffset: circumference }}
                                                animate={{ strokeDashoffset: strokeOffset }}
                                                transition={{ duration: 1.1, ease: 'easeOut' }}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="font-ui-heading text-[2rem] font-extrabold leading-none text-[#111111] sm:text-[2.2rem]">{animatedScore}</span>
                                            <span className="mt-1 text-xs text-[#4b4b53] sm:text-sm">out of 100</span>
                                            <span className="mt-1 text-xs font-semibold text-[#2f52e8] sm:mt-2">
                                                {tone.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </article>

                            <article className="min-w-0">
                                <h3 className="font-ui-heading text-[1.25rem] font-bold text-[#111111]">Missing Resume Gaps</h3>

                                <h4 className="mt-3 text-sm font-semibold text-[#111111]">Skills</h4>
                                <p className="mt-1 text-sm text-[#4b4b53]">
                                    Skills missing or weak in your resume for ATS matching.
                                </p>
                                {missingSkills.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {missingSkills.map((item, index) => (
                                            <span
                                                key={`ats-missing-skill-${item}-${index}`}
                                                className="max-w-full rounded-full bg-[#ffe7bf] px-3 py-1 text-xs font-medium text-[#8a5600] break-all"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-[#4b4b53]">No major missing skills found.</p>
                                )}

                                <h4 className="mt-4 text-sm font-semibold text-[#111111]">Vocabulary Words</h4>
                                <p className="mt-1 text-sm text-[#4b4b53]">
                                    Non-skill ATS keywords from the job description that are missing in your resume content.
                                </p>
                                {missingKeywords.length ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {missingKeywords.map((item, index) => (
                                            <span
                                                key={`ats-missing-keyword-${item}-${index}`}
                                                className="max-w-full rounded-full bg-[#fbe7ff] px-3 py-1 text-xs font-medium text-[#8a2c8f] break-all"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-[#4b4b53]">No major missing vocabulary keywords found.</p>
                                )}
                            </article>
                        </section>

                        <section className="border-b border-[#d5d9e1] pb-6">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                <div className="min-w-0">
                                    <h3 className="font-ui-heading text-[1.25rem] font-bold text-[#111111]">Get AI Improvements</h3>
                                    <p className="mt-1 text-sm text-[#4b4b53]">
                                        AI reviews your resume content and returns missing keywords, weak areas, and recommendations.
                                    </p>
                                </div>
                                <Button onClick={handleFetchAI} loading={ai.status === 'loading'} size="sm" className="w-full sm:w-auto">
                                    Get AI Improvements
                                </Button>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="ats-job-description" className="mb-1.5 block text-sm font-semibold text-[#111111]">
                                    Job Description (Optional)
                                </label>
                                <textarea
                                    id="ats-job-description"
                                    value={jobDescription}
                                    onChange={(event) => setJobDescription(event.target.value)}
                                    placeholder="Paste target job description for more role-specific AI feedback."
                                    className="min-h-[120px] w-full resize-y rounded-lg border border-[#bec6d6] bg-[#f2f4f8] px-3 py-2 text-sm text-[#2e2e2e] placeholder:text-[#6b7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f67ff]/55"
                                />
                            </div>

                            {ai.status === 'loading' ? (
                                <div className="mt-4">
                                    <Progress value={aiLoadingProgress} className="w-full space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <ProgressLabel className="min-w-0 break-words text-xs sm:text-sm">
                                                AI is generating improvements
                                            </ProgressLabel>
                                            <span className="text-sm text-[#4b4b53]">
                                                <ProgressValue /> %
                                            </span>
                                        </div>
                                        <ProgressTrack />
                                    </Progress>
                                </div>
                            ) : null}

                            <div className="mt-5">
                                <AISuggestions
                                    suggestions={ai.suggestions}
                                    improvedResume={ai.improvedResume}
                                    status={ai.status === 'loading' ? 'idle' : ai.status}
                                    error={ai.error}
                                />
                            </div>
                        </section>
                    </>
                ) : null}
            </main>
            <Footer />
        </div>
    );
}

export default ATSResults;
