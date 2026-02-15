import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TemplatePreviewModal from '@/components/resume/TemplatePreviewModal';
import TemplateInlinePreview from '@/components/resume/TemplateInlinePreview';
import { ROUTES, TEMPLATE_OPTIONS } from '@/utils/constants';

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
                    {templates.map((template) => (
                        <article key={template.id} className="overflow-hidden rounded-2xl border border-[#cfd8e3] bg-white shadow-sm">
                            <div className="overflow-hidden rounded-t-2xl">
                                <TemplateInlinePreview templateId={template.id} />
                            </div>

                            <div className="space-y-3 p-3 max-[350px]:space-y-2.5 max-[350px]:p-2.5">
                                <div className="min-w-0">
                                    <h3 className="text-[0.95rem] font-bold text-[#0f172a] max-[350px]:text-sm">{template.name}</h3>
                                    <p className="mt-0.5 text-xs text-[#4b5563] max-[350px]:text-[11px]">{template.tone}</p>
                                </div>

                                <div className="flex justify-center pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewTemplate(template)}
                                        className="inline-flex h-9 min-w-[9.5rem] items-center justify-center rounded-lg border border-[#a8b5c8] bg-white px-3 text-sm font-semibold text-[#111827] transition hover:border-[#6b7a91] hover:bg-[#f8fafc] max-[350px]:h-8 max-[350px]:min-w-[8.5rem] max-[350px]:text-xs"
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
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
                showTemplateInsights
            />
        </div>
    );
}

export default Templates;
