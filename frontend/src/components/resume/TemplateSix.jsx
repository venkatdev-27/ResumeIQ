import React from 'react';
import { formToResumeData } from '@/utils/helpers';
import { formatDateRange, formatEducationDegreeYear, getTemplateData, joinNonEmpty, toBullets, toSkillDisplayLines } from './templateData';

function TemplateSix({ resumeData, formData }) {
    const source = resumeData || formToResumeData(formData || {});
    const data = getTemplateData(source);
    const skillLines = toSkillDisplayLines(data.skills);
    const hasPhoto = Boolean(data.personalDetails.photo);

    return (
        <div id="resume-pdf" className="w-[794px] min-h-[1123px] bg-white p-8 text-sm leading-snug">
            <div className="grid grid-cols-[minmax(0,30%)_minmax(0,70%)] gap-3 text-sm leading-5">
                <aside className="bg-emerald-900 p-3 text-white">
                    {hasPhoto ? (
                        <div className="mb-2 flex justify-center">
                            <img
                                src={data.personalDetails.photo}
                                alt={data.personalDetails.fullName ? `${data.personalDetails.fullName} profile` : 'Profile photo'}
                                className="h-20 w-20 rounded-full border-2 border-white/80 object-cover"
                            />
                        </div>
                    ) : null}
                    <h1 className="text-base font-bold">{data.personalDetails.fullName}</h1>
                    <p className="min-w-0 break-words text-sm font-semibold">{data.personalDetails.title}</p>
                    <p className="mt-1 text-xs">{data.personalDetails.location}</p>
                    <p className="text-xs">{data.personalDetails.phone}</p>
                    <p className="text-xs break-all">{data.personalDetails.email}</p>
                    <p className="text-xs break-all">{data.personalDetails.linkedin}</p>
                    <p className="text-xs break-all">{data.personalDetails.website}</p>

                    {data.skills.length > 0 ? (
                        <section className="mt-2 space-y-1">
                            <h2 className="border-b border-white/50 pb-0.5 text-xs font-bold uppercase tracking-wide">Skills</h2>
                            {skillLines.map((line, lineIndex) => (
                                <p key={`skill-line-${lineIndex}`} className="text-sm">
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

                    {data.certifications.length > 0 ? (
                        <section className="mt-2 space-y-1">
                            <h2 className="border-b border-white/50 pb-0.5 text-xs font-bold uppercase tracking-wide">Certifications</h2>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {data.certifications.map((item) => (
                                    <li key={item} className="break-words">{item}</li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {data.achievements.length > 0 ? (
                        <section className="mt-2 space-y-1">
                            <h2 className="border-b border-white/50 pb-0.5 text-xs font-bold uppercase tracking-wide">Achievements</h2>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {data.achievements.map((item) => (
                                    <li key={item} className="break-words">{item}</li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {data.hobbies.length > 0 ? (
                        <section className="mt-2 space-y-1">
                            <h2 className="border-b border-white/50 pb-0.5 text-xs font-bold uppercase tracking-wide">Hobbies</h2>
                            <ul className="list-disc space-y-1 pl-4 text-sm">
                                {data.hobbies.map((item) => (
                                    <li key={item} className="break-words">{item}</li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </aside>

                <main className="min-w-0 space-y-2">
                    {data.personalDetails.summary ? (
                        <section className="min-w-0 space-y-1">
                            <h2 className="border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-wide">Profile</h2>
                            <p className="resume-summary-paragraph text-sm">{data.personalDetails.summary}</p>
                        </section>
                    ) : null}

                    {data.workExperience.length > 0 ? (
                        <section className="min-w-0 space-y-1">
                            <h2 className="border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-wide">Employment History</h2>
                            {data.workExperience.map((item) => (
                                <article key={`${item.company}-${item.role}`} className="mb-2 space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="min-w-0 break-words text-sm font-semibold">
                                            {joinNonEmpty([item.role, item.company])}
                                        </p>
                                        <p className="shrink-0 whitespace-nowrap text-right text-xs empty:hidden">{formatDateRange(item.startDate, item.endDate)}</p>
                                    </div>
                                    <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[0.72em] marker:text-black">
                                        {toBullets(item.description, [], { maxLines: item.bulletMaxLines || 3 }).map((line, lineIndex) => (
                                            <li key={`${item.company}-${lineIndex}`} className="break-words">{line}</li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </section>
                    ) : null}

                    {data.projects.length > 0 ? (
                        <section className="min-w-0 space-y-1">
                            <h2 className="border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-wide">Projects</h2>
                            {data.projects.map((item) => (
                                <article key={item.name} className="mb-2 space-y-1">
                                    <p className="min-w-0 break-words text-sm font-semibold">
                                        {joinNonEmpty([item.name, item.techStack])}
                                    </p>
                                    <p className="break-all text-xs">{item.link}</p>
                                    <ul className="list-disc space-y-1 pl-4 text-sm marker:text-[0.72em] marker:text-black">
                                        {toBullets(item.description, [], { maxLines: item.bulletMaxLines || 3 }).map((line, lineIndex) => (
                                            <li key={`${item.name}-${lineIndex}`} className="break-words">{line}</li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </section>
                    ) : null}

                    {data.education.length > 0 ? (
                        <section className="min-w-0 space-y-1">
                            <h2 className="border-b border-gray-300 pb-0.5 text-xs font-bold uppercase tracking-wide">Education</h2>
                            {data.education.map((item) => (
                                <p key={item.institution} className="text-sm">
                                    <span className="font-semibold">{formatEducationDegreeYear(item)}</span>
                                </p>
                            ))}
                        </section>
                    ) : null}
                </main>
            </div>
        </div>
    );
}

export default React.memo(TemplateSix);





