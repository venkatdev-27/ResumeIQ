import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TemplatePreviewModal from '@/components/resume/TemplatePreviewModal';
import TemplateInlinePreview from '@/components/resume/TemplateInlinePreview';
import { ROUTES, TEMPLATE_OPTIONS } from '@/utils/constants';

const getTemplateCardMeta = (templateId = '', index = 0) => {
    const numericId = Number(String(templateId || '').replace(/[^0-9]/g, '')) || index + 1;
    const atsScore = (93 + index * 0.7).toFixed(1);
    const layoutMode = numericId % 2 === 0 ? 'Column' : 'Row';

    return {
        atsScore,
        layoutMode,
        points: [
            `ATS Resume Score: ${atsScore}+`,
            `Layout: ${layoutMode}`,
            'Download PDF: One-click export ready',
        ],
    };
};

function Templates() {
    const navigate = useNavigate();
    const [previewTemplate, setPreviewTemplate] = useState(null);

    const templates = useMemo(() => TEMPLATE_OPTIONS, []);

    const handleStart = (templateId) => {
        setPreviewTemplate(null);
        navigate(`${ROUTES.resumeBuilder}?template=${templateId}`);
    };

    return (
        <div className="min-h-screen bg-slate-200/60 text-foreground">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section className="mb-7">
                    <h1 className="text-4xl font-black lowercase tracking-tight text-slate-900 sm:text-6xl">resume templates</h1>
                    <p className="mt-2 text-sm text-slate-700 sm:text-base">Choose a template, preview it, then start building with that exact design.</p>
                </section>

                <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {templates.map((template, index) => {
                        const cardMeta = getTemplateCardMeta(template.id, index);

                        return (
                            <article key={template.id} className="overflow-hidden rounded-2xl border border-[#cfd8e3] bg-white shadow-sm">
                                <div className="overflow-hidden rounded-t-2xl">
                                    <TemplateInlinePreview templateId={template.id} />
                                </div>

                                <div className="space-y-3 p-3 max-[350px]:space-y-2.5 max-[350px]:p-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="text-[0.95rem] font-bold text-[#0f172a] max-[350px]:text-sm">{template.name}</h3>
                                            <p className="mt-0.5 text-xs text-[#4b5563] max-[350px]:text-[11px]">{template.tone}</p>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white max-[350px]:px-2 max-[350px]:text-[10px]">
                                            {cardMeta.atsScore}+ ATS
                                        </span>
                                    </div>

                                    <div className="overflow-hidden rounded-xl border border-emerald-200">
                                        {cardMeta.points.map((point, pointIndex) => (
                                            <div
                                                key={`${template.id}-point-${pointIndex}`}
                                                className={`flex items-center gap-2 px-3 py-2 max-[350px]:px-2.5 max-[350px]:py-1.5 ${
                                                    pointIndex % 2 === 0 ? 'bg-emerald-50' : 'bg-white'
                                                }`}
                                            >
                                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white max-[350px]:h-4.5 max-[350px]:w-4.5 max-[350px]:text-[10px]">
                                                    ✓
                                                </span>
                                                <p className="text-xs font-medium text-[#0f172a] max-[350px]:text-[11px]">{point}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewTemplate(template)}
                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-[#a8b5c8] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:border-[#6b7a91] hover:bg-[#f8fafc] max-[350px]:h-8 max-[350px]:text-xs"
                                        >
                                            Preview
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleStart(template.id)}
                                            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 max-[350px]:h-8 max-[350px]:text-xs"
                                        >
                                            Start
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            </main>

            <Footer />

            <TemplatePreviewModal
                open={Boolean(previewTemplate)}
                template={previewTemplate}
                onClose={() => setPreviewTemplate(null)}
                selectedTemplateId={null}
                onUseTemplate={handleStart}
                actionLabel="Start"
                useSelectedState={false}
            />
        </div>
    );
}

export default Templates;
