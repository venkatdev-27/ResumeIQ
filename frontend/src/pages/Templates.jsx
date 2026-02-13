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
                        <article key={template.id} className="group relative">
                            <div className="overflow-hidden rounded-2xl">
                                <TemplateInlinePreview templateId={template.id} />
                            </div>

                            <button
                                type="button"
                                onClick={() => setPreviewTemplate(template)}
                                className="absolute bottom-4 left-1/2 inline-flex h-12 -translate-x-1/2 items-center justify-center rounded-full border border-[#e0b400] bg-[#facc15] px-10 text-lg font-black text-slate-900 shadow-md"
                            >
                                Preview
                            </button>
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
            />
        </div>
    );
}

export default Templates;
