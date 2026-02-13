import React from 'react';
import { formToResumeData } from '@/utils/helpers';
import { formatDateRange, formatEducationDegreeYear, getTemplateData, joinNonEmpty, toBullets, toSkillDisplayLines } from './templateData';

function TemplateTwo({ resumeData, formData }) {
    const source = resumeData || formToResumeData(formData || {});
    const data = getTemplateData(source);
    const skillLines = toSkillDisplayLines(data.skills);
    const primaryContact = joinNonEmpty([data.personalDetails.email, data.personalDetails.phone, data.personalDetails.location]);
    const secondaryContact = joinNonEmpty([data.personalDetails.linkedin, data.personalDetails.website]);

    return (
        <div id="resume-pdf" className="w-[794px] min-h-[1123px] bg-white p-8 text-sm leading-snug">
            <div className="mb-3 border-b border-gray-300 pb-2 text-sm leading-5">
                <h1 className="text-base font-bold tracking-tight">{data.personalDetails.fullName}</h1>
                <p className="min-w-0 break-words text-sm font-semibold">{data.personalDetails.title}</p>
                {primaryContact ? <p className="break-words text-xs">{primaryContact}</p> : null}
                {secondaryContact ? <p className="break-all text-xs">{secondaryContact}</p> : null}
            </div>

            <div className="grid grid-cols-[minmax(0,30%)_minmax(0,70%)] gap-3 text-sm leading-5">
                <aside className="min-w-0 space-y-2">
                    {data.personalDetails.summary ? (
                        <section className="min-w-0 space-y-1">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wide">Summary</h2>
                                <hr className="mt-1 border-t border-gray-300" />
                            </div>
                            <p className="whitespace-pre-line text-sm">{data.personalDetails.summary}</p>
                        </section>
                    ) : null}

                    {data.skills.length > 0 ? (
                        <section className="min-w-0 space-y-1">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wide">Skills</h2>
                                <hr className="mt-1 border-t border-gray-300" />
                            </div>
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

                    {data.education.length > 0 ? (
                        <section className="min-w-0 space-y-1">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wide">Education</h2>
                                <hr className="mt-1 border-t border-gray-300" />
                            </div>
                            {data.education.map((item) => (
                                <p key={item.institution} className="text-sm">
                                    <span className="font-semibold">{formatEducationDegreeYear(item)}</span>
                                </p>
                            ))}
                        </section>
                    ) : null}

                    {data.certifications.length > 0 ? (
                        <section className="min-w-0 space-y-1">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wide">Certifications</h2>
                                <hr className="mt-1 border-t border-gray-300" />
                            </div>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {data.certifications.map((item) => (
                                    <li key={item} className="break-words">{item}</li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {data.achievements.length > 0 ? (
                        <section className="min-w-0 space-y-1">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wide">Achievements</h2>
                                <hr className="mt-1 border-t border-gray-300" />
                            </div>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {data.achievements.map((item) => (
                                    <li key={item} className="break-words">{item}</li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </aside>

                <main className="min-w-0 space-y-2">
                    {data.workExperience.length > 0 ? (
                        <section className="min-w-0 space-y-2">
                            <h2 className="border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-wide">Work Experience</h2>
                            {data.workExperience.map((item) => (
                                <article key={`${item.company}-${item.role}`} className="min-w-0 space-y-1">
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
                        <section className="min-w-0 space-y-2">
                            <h2 className="border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-wide">Projects</h2>
                            {data.projects.map((item) => (
                                <article key={item.name} className="min-w-0 space-y-1">
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
                </main>
            </div>
        </div>
    );
}

export default React.memo(TemplateTwo);





