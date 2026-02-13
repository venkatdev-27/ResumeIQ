import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Loader from '@/components/common/Loader';
import ResumeForm from '@/components/resume/ResumeForm';
import { enhanceResumeWithAI, saveResumeBuilder, setResumeForm, setTemplate, updateResumeSection } from '@/redux/resumeSlice';
import useAutosave from '@/hooks/useAutosave';
import { RESUME_DRAFT_STORAGE_KEY, ROUTES, TEMPLATE_OPTIONS } from '@/utils/constants';
import { safeJsonParse } from '@/utils/helpers';

function ResumeBuilder() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { resumeData, template, saveStatus, saveError, uploadStatus, improveStatus, improveError } = useSelector((state) => state.resume);

    useEffect(() => {
        const draft = safeJsonParse(localStorage.getItem(RESUME_DRAFT_STORAGE_KEY), null);
        if (!draft || typeof draft !== 'object') {
            return;
        }

        if (draft.resumeData) {
            dispatch(
                setResumeForm({
                    resumeData: draft.resumeData,
                    template: draft.template,
                }),
            );
            return;
        }

        dispatch(setResumeForm(draft));
    }, [dispatch]);

    useEffect(() => {
        const templateFromQuery = new URLSearchParams(location.search).get('template');
        if (!templateFromQuery) {
            return;
        }

        const isValidTemplate = TEMPLATE_OPTIONS.some((item) => item.id === templateFromQuery);
        if (!isValidTemplate) {
            return;
        }

        dispatch(setTemplate(templateFromQuery));
    }, [dispatch, location.search]);

    useAutosave(
        {
            resumeData,
            template,
        },
        (value) => {
            localStorage.setItem(RESUME_DRAFT_STORAGE_KEY, JSON.stringify(value));
        },
        { delay: 1200, enabled: true },
    );

    const handleSectionChange = (section, value) => {
        dispatch(updateResumeSection({ section, value }));
    };

    const handleSaveResume = async () => {
        const result = await dispatch(saveResumeBuilder());
        if (saveResumeBuilder.fulfilled.match(result)) {
            navigate(ROUTES.resumePreview);
        }
    };

    const handleEnhanceResume = async () => {
        const result = await dispatch(enhanceResumeWithAI());
        if (enhanceResumeWithAI.fulfilled.match(result)) {
            navigate(ROUTES.resumePreview);
        }
    };

    return (
        <div className="resume-builder-page min-h-screen overflow-x-hidden bg-[#f5f5f7] text-[#111827]">
            <Navbar />
            <main className="mx-auto max-w-3xl space-y-5 overflow-x-hidden px-4 pb-28 pt-2 max-[350px]:px-2.5 sm:px-6 sm:pb-12 sm:pt-3">
                <section className="min-w-0 overflow-x-hidden">
                    <ResumeForm
                        resumeData={resumeData}
                        onUpdateResumeSection={handleSectionChange}
                        disabled={uploadStatus === 'loading'}
                        saveStatus={saveStatus}
                        onSave={handleSaveResume}
                        saveError={saveError}
                        onEnhance={handleEnhanceResume}
                        improveStatus={improveStatus}
                        improveError={improveError}
                    />
                </section>
            </main>
            {improveStatus === 'loading' ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#f5f5f7]/75 backdrop-blur-[1px]">
                    <div className="inline-flex items-center gap-3 rounded-2xl border border-[#d5d9e1] bg-white px-4 py-3 text-sm font-semibold text-[#111827] shadow-sm">
                        <Loader size="md" className="border-[#375cf6] border-t-transparent" />
                        <span>Enhancing resume with AI...</span>
                    </div>
                </div>
            ) : null}
            <Footer />
        </div>
    );
}

export default ResumeBuilder;
