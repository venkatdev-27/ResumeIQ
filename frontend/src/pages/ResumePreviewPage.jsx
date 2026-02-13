import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/common/Button';
import ResumePreview from '@/components/resume/ResumePreview';
import { setResumeForm } from '@/redux/resumeSlice';
import { RESUME_DRAFT_STORAGE_KEY, ROUTES } from '@/utils/constants';
import { safeJsonParse } from '@/utils/helpers';

const hasMeaningfulResumeContent = (resumeData = {}) => {
    const personal = resumeData?.personalDetails || {};
    const hasPersonal = Boolean(
        String(personal.fullName || '').trim() ||
            String(personal.title || '').trim() ||
            String(personal.summary || '').trim(),
    );
    const hasExperience = Array.isArray(resumeData?.workExperience)
        ? resumeData.workExperience.some(
              (item) =>
                  String(item?.company || '').trim() ||
                  String(item?.role || '').trim() ||
                  String(item?.description || '').trim(),
          )
        : false;
    const hasProjects = Array.isArray(resumeData?.projects)
        ? resumeData.projects.some((item) => String(item?.name || '').trim() || String(item?.description || '').trim())
        : false;
    const hasInternships = Array.isArray(resumeData?.internships)
        ? resumeData.internships.some(
              (item) =>
                  String(item?.company || '').trim() ||
                  String(item?.role || '').trim() ||
                  String(item?.description || '').trim(),
          )
        : false;
    const hasEducation = Array.isArray(resumeData?.education)
        ? resumeData.education.some(
              (item) =>
                  String(item?.institution || '').trim() ||
                  String(item?.degree || '').trim() ||
                  String(item?.description || '').trim(),
          )
        : false;
    const hasSkills = Array.isArray(resumeData?.skills) ? resumeData.skills.some((item) => String(item || '').trim()) : false;

    return hasPersonal || hasExperience || hasProjects || hasInternships || hasEducation || hasSkills;
};

function ResumePreviewPage() {
    const dispatch = useDispatch();
    const { resumeData, enhancedResume, form, template } = useSelector((state) => state.resume);

    useEffect(() => {
        const hasLiveStateData = hasMeaningfulResumeContent(enhancedResume) || hasMeaningfulResumeContent(resumeData);
        if (hasLiveStateData) {
            return;
        }

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
    }, [dispatch, enhancedResume, resumeData]);

    const effectiveData = useMemo(() => {
        if (enhancedResume && typeof enhancedResume === 'object') {
            return enhancedResume;
        }
        return resumeData;
    }, [enhancedResume, resumeData]);

    const hasContent = useMemo(() => hasMeaningfulResumeContent(effectiveData), [effectiveData]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
                {hasContent ? (
                    <ResumePreview resumeData={effectiveData} enhancedResume={enhancedResume} formData={form} template={template} />
                ) : (
                    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <p className="text-sm text-muted-foreground">No resume content found. Fill and save the form first.</p>
                        <Link to={ROUTES.resumeBuilder} className="mt-3 inline-flex">
                            <Button type="button" size="sm">
                                Go To Resume Form
                            </Button>
                        </Link>
                    </section>
                )}
            </main>
            <Footer />
        </div>
    );
}

export default React.memo(ResumePreviewPage);
