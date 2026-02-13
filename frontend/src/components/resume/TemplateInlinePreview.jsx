import React, { useEffect, useMemo, useRef, useState } from 'react';
import { A4_HEIGHT, A4_WIDTH, hasMeaningfulResumeData, PREVIEW_RESUME_DATA, TEMPLATE_COMPONENT_MAP } from './templatePreviewConfig';

function TemplateInlinePreview({ templateId, resumeData = null }) {
    const SelectedTemplate = useMemo(() => TEMPLATE_COMPONENT_MAP[templateId] || TEMPLATE_COMPONENT_MAP.template1, [templateId]);
    const previewData = useMemo(
        () => (hasMeaningfulResumeData(resumeData) ? resumeData : PREVIEW_RESUME_DATA),
        [resumeData],
    );
    const containerRef = useRef(null);
    const [scale, setScale] = useState(0.2);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const updateScale = () => {
            const width = container.clientWidth;
            if (!width) {
                return;
            }

            const nextScale = Math.min(width / A4_WIDTH, 1);
            setScale((prev) => (Math.abs(prev - nextScale) < 0.005 ? prev : nextScale));
        };

        updateScale();

        const observer = new ResizeObserver(updateScale);
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const scaledWidth = Math.max(1, Math.round(A4_WIDTH * scale));
    const scaledHeight = Math.max(1, Math.round(A4_HEIGHT * scale));

    return (
        <div ref={containerRef} className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="mx-auto overflow-hidden" style={{ width: scaledWidth, height: scaledHeight }}>
                <div
                    style={{
                        width: A4_WIDTH,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <SelectedTemplate resumeData={previewData} />
                </div>
            </div>
        </div>
    );
}

export default React.memo(TemplateInlinePreview);
