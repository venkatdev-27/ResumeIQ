import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/common/Button';
import { generateResumePdfAPI } from '@/api/resumeAPI';
import { downloadResume } from '@/utils/downloadUtils';
import { formToResumeData, getErrorMessage } from '@/utils/helpers';
import TemplateOne from './TemplateOne';
import TemplateTwo from './TemplateTwo';
import TemplateThree from './TemplateThree';
import TemplateFour from './TemplateFour';
import TemplateFive from './TemplateFive';
import TemplateSix from './TemplateSix';
import TemplateSeven from './TemplateSeven';
import TemplateEight from './TemplateEight';
import TemplateNine from './TemplateNine';
import TemplateTen from './TemplateTen';

const templates = {
    template1: TemplateOne,
    template2: TemplateTwo,
    template3: TemplateThree,
    template4: TemplateFour,
    template5: TemplateFive,
    template6: TemplateSix,
    template7: TemplateSeven,
    template8: TemplateEight,
    template9: TemplateNine,
    template10: TemplateTen,
    templateOne: TemplateOne,
    templateTwo: TemplateTwo,
};

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

const hasText = (value) => Boolean(String(value ?? '').trim());

const normalizeStringList = (value = []) =>
    (Array.isArray(value) ? value : [])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);

const normalizeEntryList = (value = [], keys = []) =>
    (Array.isArray(value) ? value : [])
        .filter((item) => keys.some((key) => hasText(item?.[key])));

const buildVisibilityMask = (resumeData = {}) => {
    const personal = resumeData?.personalDetails || {};

    return {
        personalDetails: {
            fullName: hasText(personal.fullName),
            title: hasText(personal.title),
            email: hasText(personal.email),
            phone: hasText(personal.phone),
            location: hasText(personal.location),
            summary: hasText(personal.summary),
            linkedin: hasText(personal.linkedin),
            website: hasText(personal.website),
            photo: hasText(personal.photo),
        },
        workExperience: normalizeEntryList(resumeData?.workExperience, ['company', 'role', 'startDate', 'endDate', 'description']).length > 0,
        projects: normalizeEntryList(resumeData?.projects, ['name', 'techStack', 'link', 'description']).length > 0,
        internships: normalizeEntryList(resumeData?.internships, ['company', 'role', 'startDate', 'endDate', 'description']).length > 0,
        education: normalizeEntryList(resumeData?.education, ['institution', 'degree', 'startYear', 'endYear', 'description']).length > 0,
        skills: normalizeStringList(resumeData?.skills).length > 0,
        certifications: normalizeStringList(resumeData?.certifications).length > 0,
        achievements: normalizeStringList(resumeData?.achievements).length > 0,
        hobbies: normalizeStringList(resumeData?.hobbies).length > 0,
    };
};

const applyVisibilityMask = (previewData = {}, maskSource = {}) => {
    const mask = buildVisibilityMask(maskSource);
    const previewPersonal = previewData?.personalDetails || {};

    return {
        ...previewData,
        personalDetails: {
            ...previewPersonal,
            fullName: mask.personalDetails.fullName ? String(previewPersonal.fullName || '').trim() : '',
            title: mask.personalDetails.title ? String(previewPersonal.title || '').trim() : '',
            email: mask.personalDetails.email ? String(previewPersonal.email || '').trim() : '',
            phone: mask.personalDetails.phone ? String(previewPersonal.phone || '').trim() : '',
            location: mask.personalDetails.location ? String(previewPersonal.location || '').trim() : '',
            summary:
                mask.personalDetails.summary || hasText(previewPersonal.summary)
                    ? String(previewPersonal.summary || '').trim()
                    : '',
            linkedin: mask.personalDetails.linkedin ? String(previewPersonal.linkedin || '').trim() : '',
            website: mask.personalDetails.website ? String(previewPersonal.website || '').trim() : '',
            photo: mask.personalDetails.photo ? String(previewPersonal.photo || '').trim() : '',
        },
        workExperience: mask.workExperience
            ? normalizeEntryList(previewData?.workExperience, ['company', 'role', 'startDate', 'endDate', 'description'])
            : [],
        projects: mask.projects
            ? normalizeEntryList(previewData?.projects, ['name', 'techStack', 'link', 'description'])
            : [],
        internships: mask.internships
            ? normalizeEntryList(previewData?.internships, ['company', 'role', 'startDate', 'endDate', 'description'])
            : [],
        education: mask.education
            ? normalizeEntryList(previewData?.education, ['institution', 'degree', 'startYear', 'endYear', 'description'])
            : [],
        skills: mask.skills ? normalizeStringList(previewData?.skills) : [],
        certifications: mask.certifications ? normalizeStringList(previewData?.certifications) : [],
        achievements: mask.achievements ? normalizeStringList(previewData?.achievements) : [],
        hobbies: mask.hobbies ? normalizeStringList(previewData?.hobbies) : [],
    };
};



const buildPdfHtmlDocument = (resumeElement) => {
    const styleTags = Array.from(document.querySelectorAll('style'))
        .map((node) => `<style>${node.textContent || ''}</style>`)
        .join('');
    const stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((node) => {
            const href = node.getAttribute('href');
            if (!href) {
                return '';
            }

            const absoluteHref = new URL(href, window.location.origin).href;
            return `<link rel="stylesheet" href="${absoluteHref}" />`;
        })
        .join('');

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${stylesheetLinks}
    ${styleTags}
  </head>
  <body style="margin:0;padding:0;background:#ffffff;">
    ${resumeElement.outerHTML}
  </body>
</html>`;
};

function ResumePreview({ resumeData, enhancedResume, formData, template }) {
    const SelectedTemplate = useMemo(() => templates[template] || TemplateOne, [template]);
    const previewData = useMemo(() => {
        const fallbackFromForm = formToResumeData(formData || {});
        const rawUserData = resumeData && typeof resumeData === 'object' ? resumeData : fallbackFromForm;
        const sourceData = enhancedResume && typeof enhancedResume === 'object' ? enhancedResume : rawUserData;
        return applyVisibilityMask(sourceData, rawUserData);
    }, [enhancedResume, resumeData, formData]);

    const containerRef = useRef(null);
    const previewRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [downloadStatus, setDownloadStatus] = useState('idle');
    const [downloadError, setDownloadError] = useState(null);
    const isMobile = scale < 0.7;

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        let frameId = null;

        const updateScale = () => {
            const width = element.clientWidth;
            if (!width) return;

            // Calculate scale to fit A4 into container
            const fitScale = width / A4_WIDTH;

            // Improved minimum scale for very small screens
            // Allow smaller scale to ensure all content is visible
            // On very small screens, allow fit-scale without forcing a larger minimum.
            const mobileMinScale = width <= 350 ? 0.01 : width < 450 ? 0.45 : 0.6;

            // Clamp between min and 1
            const nextScale = Math.min(Math.max(fitScale, mobileMinScale), 1);

            setScale((prev) =>
                Math.abs(prev - nextScale) < 0.01 ? prev : nextScale
            );
        };

        // Use rAF to avoid ResizeObserver loop & improve performance
        const handleResize = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(updateScale);
        };

        updateScale();

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(element);

        return () => {
            cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
        };
    }, []);


    const handleDownloadPdf = async () => {
        const previewRoot = previewRef.current;
        if (!previewRoot) {
            setDownloadError('Resume preview is not ready yet. Please try again.');
            return;
        }

        const resumeElement = previewRoot.querySelector('#resume-pdf');
        if (!resumeElement) {
            setDownloadError('Resume content is not available for PDF download.');
            return;
        }

        setDownloadStatus('loading');
        setDownloadError(null);

        try {
            const html = buildPdfHtmlDocument(resumeElement);
            const responseBlob = await generateResumePdfAPI({
                html,
                fileName: 'resume.pdf',
            });
            
            // Use the new mobile-safe download utility
            await downloadResume(
                () => Promise.resolve(responseBlob),
                null,
                'resume.pdf'
            );
            
            setDownloadStatus('succeeded');
        } catch (error) {
            setDownloadStatus('failed');
            setDownloadError(error.message || 'Unable to download PDF. Please try again.');
        }
    };

    const scaledWidth = Math.max(1, Math.round(A4_WIDTH * scale));
    const scaledHeight = Math.max(1, Math.round(A4_HEIGHT * scale));

    return (
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-sm max-[350px]:overflow-x-hidden max-[350px]:rounded-xl max-[350px]:p-3">
            <h3 className="mb-3 text-base font-semibold text-foreground max-[350px]:text-sm">Live Preview</h3>
            <div
                ref={containerRef}
                className="mx-auto w-full overflow-x-auto overflow-y-hidden pb-4 max-[350px]:overflow-x-hidden"
                style={{ 
                    maxWidth: '100%',
                    minWidth: '0',
                    minHeight: '200px'
                }}
            >
                <div 
                    className="mx-auto overflow-hidden bg-white shadow-sm"
                    style={{ 
                        width: scaledWidth, 
                        height: isMobile ? scaledHeight * 1.1 : "auto",
                        minWidth: '100%',
                        boxSizing: 'border-box'
                    }}
                >
                    <div
                        ref={previewRef}
                        style={{
                            width: A4_WIDTH,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            minWidth: '100%',
                            minHeight: '100%'
                        }}
                    >
                        <SelectedTemplate resumeData={previewData} formData={formData} />
                    </div>
                </div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
                <Button type="button" onClick={handleDownloadPdf} loading={downloadStatus === 'loading'} disabled={downloadStatus === 'loading'}>
                    Download PDF
                </Button>
                {downloadError ? <p className="text-xs text-destructive">{downloadError}</p> : null}
            </div>
        </div>
    );
}

export default React.memo(ResumePreview);
