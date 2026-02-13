import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/common/Button';
import JDInput from '@/components/ats/JDInput';
import { uploadResumePDF } from '@/redux/resumeSlice';
import { ROUTES } from '@/utils/constants';
import { formatBytes } from '@/utils/helpers';

function ATSScanner() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { uploadedFile, uploadedText, uploadStatus, uploadError, cloudinaryUrl, resumeId } = useSelector((state) => state.resume);

    const [selectedFile, setSelectedFile] = useState(null);
    const [jobDescription, setJobDescription] = useState('');
    const fileInputId = 'ats-resume-file-input';

    const canAnalyze = useMemo(() => Boolean(resumeId || String(uploadedText || '').trim()), [resumeId, uploadedText]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const handleUploadResume = async () => {
        if (!selectedFile) {
            return;
        }
        await dispatch(uploadResumePDF(selectedFile));
    };

    const handleFetchATS = () => {
        if (!canAnalyze) {
            return;
        }

        navigate(ROUTES.atsResults, {
            state: {
                runAts: true,
                jobDescription,
            },
        });
    };

    return (
        <div className="ats-scanner-page min-h-screen bg-[#f1f2f4] text-[#2e2e2e]">
            <Navbar />
            <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 max-[350px]:px-2.5 sm:px-6 lg:px-8">
                <section className="border-y border-[#d5d9e1] py-5 max-[350px]:py-4">
                    <div className="border-b border-[#d5d9e1] pb-5 max-[350px]:pb-4">
                        <h2 className="font-ui-heading text-[1.8rem] font-extrabold leading-tight text-[#111111] max-[350px]:text-[1.35rem] sm:text-[2rem]">
                            Upload Resume (PDF)
                        </h2>
                        <div className="mt-3 w-full max-w-xl space-y-3">
                            <input
                                id={fileInputId}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleFileChange}
                                className="sr-only"
                            />

                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                                <label
                                    htmlFor={fileInputId}
                                    className="inline-flex h-10 w-[130px] cursor-pointer items-center justify-center rounded-xl bg-[#375cf6] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(55,92,246,0.25)] transition hover:brightness-110 sm:h-9 sm:w-[130px] sm:text-xs"
                                >
                                    Choose File
                                </label>
                                <p className="min-w-0 flex-1 break-words text-sm text-[#2e2e2e] max-[350px]:text-xs">
                                    {selectedFile ? selectedFile.name : 'No file chosen'}
                                </p>
                            </div>

                            <Button
                                onClick={handleUploadResume}
                                loading={uploadStatus === 'loading'}
                                disabled={!selectedFile}
                                size="sm"
                                className="h-10 w-[170px] rounded-xl px-4 text-sm sm:h-9 sm:w-[170px] sm:text-xs"
                            >
                                Upload Resume
                            </Button>
                        </div>

                        <div className="mt-2.5 space-y-1.5">
                            {selectedFile ? (
                                <p className="text-xs text-[#4b4b53] max-[350px]:text-[11px]">
                                    Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                                </p>
                            ) : null}

                            {uploadedFile ? (
                                <p className="text-xs text-emerald-700 max-[350px]:text-[11px]">
                                    Uploaded: {uploadedFile.name} ({formatBytes(uploadedFile.size)})
                                </p>
                            ) : null}

                            {cloudinaryUrl ? (
                                <a
                                    href={cloudinaryUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block text-xs text-[#375cf6] underline-offset-2 hover:underline max-[350px]:text-[11px]"
                                >
                                    Open uploaded file (Cloudinary)
                                </a>
                            ) : null}

                            {uploadError ? <p className="text-sm text-destructive max-[350px]:text-xs">{uploadError}</p> : null}
                        </div>
                    </div>

                    <div className="mt-4 max-w-3xl max-[350px]:mt-3">
                        <JDInput
                            value={jobDescription}
                            onChange={setJobDescription}
                            onFetchScore={handleFetchATS}
                            disabled={!canAnalyze}
                            embedded
                            showSuggestionsButton={false}
                        />
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}

export default ATSScanner;
