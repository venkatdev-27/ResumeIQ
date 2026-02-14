import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/common/Button';
import AISuggestions from '@/components/ai/AISuggestions';
import { fetchAISuggestions } from '@/redux/aiSlice';
import { ROUTES } from '@/utils/constants';
import { resumeFormToText } from '@/utils/helpers';

function AIImprovements() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { uploadedText, resumeId, form } = useSelector((state) => state.resume);
    const ats = useSelector((state) => state.ats);
    const ai = useSelector((state) => state.ai);
    const [jobDescription, setJobDescription] = React.useState(() => String(location.state?.jobDescription || ''));
    const hasTriggeredInitialFetchRef = React.useRef(false);

    const hasResumeContent = React.useMemo(() => {
        const formText = resumeFormToText(form);
        return Boolean(resumeId || String(uploadedText || '').trim() || String(formText || '').trim());
    }, [resumeId, uploadedText, form]);

    const requestImprovements = React.useCallback(async () => {
        if (!hasResumeContent) {
            return;
        }

        await dispatch(
            fetchAISuggestions({
                jobDescription,
                atsContext: {
                    score: ats.score,
                    matchedKeywords: ats.matchedKeywords || [],
                    missingKeywords: ats.missingKeywords || [],
                    missingSkills: ats.missingSkills || [],
                },
            }),
        );
    }, [dispatch, hasResumeContent, jobDescription, ats.score, ats.matchedKeywords, ats.missingKeywords, ats.missingSkills]);

    React.useEffect(() => {
        if (hasTriggeredInitialFetchRef.current || !hasResumeContent) {
            return;
        }

        if (location.state?.runAi || ai.status === 'idle') {
            hasTriggeredInitialFetchRef.current = true;
            requestImprovements();
        }
    }, [hasResumeContent, location.state, ai.status, requestImprovements]);

    if (!hasResumeContent) {
        return (
            <div className="min-h-screen overflow-x-hidden bg-[#f1f2f4] text-[#2e2e2e]">
                <Navbar />
                <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-6 lg:px-8">
                    <section className="border-b border-[#d5d9e1] pb-6">
                        <h2 className="font-ui-heading text-[1.6rem] font-bold text-[#111111] sm:text-[1.8rem]">No Resume Context Found</h2>
                        <p className="mt-2 text-sm text-[#4b4b53]">Upload your resume first, then get AI improvements.</p>
                        <Link to={ROUTES.atsScanner} className="mt-4 inline-flex">
                            <Button size="sm">Go To ATS Scanner</Button>
                        </Link>
                    </section>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#f1f2f4] text-[#2e2e2e]">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl space-y-6 px-3 py-5 max-[350px]:space-y-5 max-[350px]:px-2 sm:px-6 lg:px-8">
                <section className="border-b border-[#d5d9e1] pb-4 sm:pb-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="font-ui-heading text-[1.65rem] font-extrabold leading-tight text-[#111111] sm:text-[1.95rem]">
                                AI Resume Improvements
                            </h1>
                            <p className="mt-1 max-w-3xl text-sm text-[#4b4b53]">
                                Improvement suggestions based on your uploaded resume and ATS context.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.atsResults)}>
                            Back To ATS Result
                        </Button>
                    </div>
                </section>

                <section className="min-w-0 border-b border-[#d5d9e1] pb-6">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="min-w-0">
                            <label htmlFor="ai-job-description" className="mb-1.5 block text-sm font-semibold text-[#111111]">
                                Job Description (Optional)
                            </label>
                            <textarea
                                id="ai-job-description"
                                value={jobDescription}
                                onChange={(event) => setJobDescription(event.target.value)}
                                placeholder="Paste target job description for more role-specific AI feedback."
                                className="min-h-[120px] w-full resize-y rounded-lg border border-[#bec6d6] bg-[#f2f4f8] px-3 py-2 text-sm text-[#2e2e2e] placeholder:text-[#6b7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f67ff]/55"
                            />
                        </div>
                        <Button onClick={requestImprovements} loading={ai.status === 'loading'} size="sm" className="w-full sm:w-auto">
                            Regenerate Improvements
                        </Button>
                    </div>

                    <div className="mt-5 min-w-0 max-w-full overflow-x-hidden">
                        <AISuggestions
                            suggestions={ai.suggestions}
                            improvedResume={ai.improvedResume}
                            status={ai.status}
                            error={ai.error}
                            className="max-w-full"
                        />
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default AIImprovements;
