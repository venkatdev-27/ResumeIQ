import React from 'react';
import { formToResumeData } from '@/utils/helpers';
import { formatDateRange, formatEducationDegreeYear, getTemplateData, joinNonEmpty, toBullets, toSkillDisplayLines } from './templateData';

function TemplateTen({ resumeData, formData }) {
    const source = resumeData || formToResumeData(formData || {});
    const data = getTemplateData(source);
    const skillLines = toSkillDisplayLines(data.skills);
    const primaryContact = joinNonEmpty([data.personalDetails.location, data.personalDetails.phone, data.personalDetails.email]);
    const secondaryContact = joinNonEmpty([data.personalDetails.linkedin, data.personalDetails.website]);

    return (
        <div id="resume-pdf" className="w-[794px] min-h-[1123px] bg-white p-8 text-sm leading-snug">
            <div className="text-sm leading-5 break-words">
                <header className="mb-2 border-b-2 border-blue-500 pb-1">
                    <h1 className="text-base font-bold text-blue-700">{data.personalDetails.fullName}</h1>
                    <p className="min-w-0 break-words text-sm font-semibold">{data.personalDetails.title}</p>
                    {primaryContact ? <p className="break-words text-xs">{primaryContact}</p> : null}
                    {secondaryContact ? <p className="break-all text-xs">{secondaryContact}</p> : null}
                </header>

                {data.personalDetails.summary ? (
                    <section className="mb-2 space-y-1">
                        <h2 className="border-b border-blue-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">Summary</h2>
                        <p className="whitespace-pre-line text-sm">{data.personalDetails.summary}</p>
                    </section>
                ) : null}

                {data.workExperience.length > 0 ? (
                    <section className="mb-2 space-y-1">
                        <h2 className="border-b border-blue-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">Professional Experience</h2>
                        {data.workExperience.map((item) => (
                            <article key={`${item.company}-${item.role}`} className="mb-2 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 break-words text-sm font-semibold">
                                        {joinNonEmpty([item.role, item.company])}
                                    </p>
                                    <p className="shrink-0 whitespace-nowrap text-right text-xs empty:hidden">{formatDateRange(item.startDate, item.endDate)}</p>
                                </div>
                                <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[0.72em] marker:text-black">
                                    {toBullets(item.description).map((line, lineIndex) => (
                                        <li key={`${item.company}-${lineIndex}`} className="break-words">{line}</li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </section>
                ) : null}

                {data.projects.length > 0 ? (
                    <section className="mb-2 space-y-1">
                        <h2 className="border-b border-blue-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">Projects</h2>
                        {data.projects.map((item) => (
                            <article key={item.name} className="mb-2 space-y-1">
                                <p className="min-w-0 break-words text-sm font-semibold">
                                    {joinNonEmpty([item.name, item.techStack])}
                                </p>
                                <p className="break-all text-xs">{item.link}</p>
                                <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[0.72em] marker:text-black">
                                    {toBullets(item.description).map((line, lineIndex) => (
                                        <li key={`${item.name}-${lineIndex}`} className="break-words">{line}</li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </section>
                ) : null}

                {data.education.length > 0 ? (
                    <section className="mb-2 space-y-1">
                        <h2 className="border-b border-blue-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">Education</h2>
                        {data.education.map((item) => (
                            <p key={item.institution} className="text-sm">
                                <span className="font-semibold">{formatEducationDegreeYear(item)}</span>
                            </p>
                        ))}
                    </section>
                ) : null}

                {data.skills.length > 0 ? (
                    <section className="mb-2 space-y-1">
                        <h2 className="border-b border-blue-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">Technical Skills</h2>
                        {skillLines.map((line, lineIndex) => (
                            <p key={`skill-line-${lineIndex}`} className="break-words text-sm">
                                {line.heading ? (
                                    <>
                                        <span className="font-semibold">{line.heading}:</span> {line.text}
                                    </>
                                ) : (
                                    line.text
                                )}
                            </p>
                        ))}
                    </section>
                ) : null}

                <section className="grid grid-cols-2 gap-2">
                    {data.certifications.length > 0 ? (
                        <div className="space-y-1">
                            <h2 className="border-b border-blue-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">Certifications</h2>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {data.certifications.map((item) => (
                                    <li key={item} className="break-words">{item}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {data.achievements.length > 0 ? (
                        <div className="space-y-1">
                            <h2 className="border-b border-blue-300 pb-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">Achievements</h2>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {data.achievements.map((item) => (
                                    <li key={item} className="break-words">{item}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </section>
            </div>
        </div>
    );
}

export default React.memo(TemplateTen);




