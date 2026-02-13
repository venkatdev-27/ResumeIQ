import React from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '@/components/common/Button';

function FormStepper({
    steps,
    currentStep,
    onNext,
    onBack,
    onStepSelect,
    isNextDisabled = false,
    isBackDisabled = false,
    isSaving = false,
    onSave,
    onEnhance,
    isEnhancing = false,
    isEnhanceDisabled = false,
}) {
    const isLastStep = currentStep === steps.length - 1;
    const currentLabel = steps[currentStep]?.label || '';
    const nextLabel = !isLastStep ? steps[currentStep + 1]?.label || 'Next Step' : '';

    const topNavButtonClass =
        'h-10 w-10 rounded-full border-0 bg-transparent px-0 text-[#111827] shadow-none hover:bg-[#dfe3ea] disabled:cursor-not-allowed disabled:opacity-35';

    const handleCenterClick = () => {
        if (typeof onStepSelect === 'function') {
            onStepSelect(currentStep);
        }
    };

    return (
        <>
            <div className="sticky top-[7px] z-20 -mt-1 sm:top-[70px]">
                <div className="rounded-[2.2rem] border border-[#d5d9e0] bg-gradient-to-b from-[#f8f9fb] to-[#eceef2] px-3 py-2.5 shadow-[0_2px_12px_rgba(15,23,42,0.15)] sm:px-4 sm:py-3">
                    <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-2">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={isBackDisabled}
                            aria-label="Previous step"
                            className="group relative h-12 w-12 rounded-full bg-white/80 shadow-[0_2px_8px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_16px_rgba(15,23,42,0.2)] active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/60 to-transparent"></div>
                            <ArrowLeft className="relative z-10 mx-auto h-6 w-6 text-[#1f2937] transition-colors duration-300 group-hover:text-[#2f5eff] group-disabled:text-[#9ca3af]" strokeWidth={2.5} />
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-transparent via-[#2f5eff]/20 to-transparent opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"></div>
                        </button>

                        <button type="button" onClick={handleCenterClick} className="min-w-0 text-center">
                            <p className="text-[0.9rem] font-medium leading-tight text-[#374151] sm:text-[1rem]">
                                Step {currentStep + 1} of {steps.length}
                            </p>
                            <span className="mt-1 inline-flex max-w-full items-center justify-center gap-2 font-ui-heading text-[1.75rem] font-extrabold leading-none text-[#111827] max-[380px]:text-[1.4rem] sm:text-[2rem]">
                                <span className="truncate">{currentLabel}</span>
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={onNext}
                            disabled={isNextDisabled || isLastStep}
                            aria-label="Next step"
                            className="group relative h-12 w-12 rounded-full bg-white/80 shadow-[0_2px_8px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_16px_rgba(15,23,42,0.2)] active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/60 to-transparent"></div>
                            <ChevronRight className="relative z-10 mx-auto h-6 w-6 text-[#1f2937] transition-colors duration-300 group-hover:text-[#2f5eff] group-disabled:text-[#9ca3af]" strokeWidth={2.5} />
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-transparent via-[#2f5eff]/20 to-transparent opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"></div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dce1e8] bg-[#f5f5f7]/95 px-4 pb-4 pt-3 backdrop-blur-sm sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <div className="mx-auto w-full max-w-3xl">
                    {!isLastStep ? (
                        <Button
                            type="button"
                            onClick={onNext}
                            disabled={isNextDisabled}
                            className="h-14 w-full rounded-[999px] bg-[#2f5eff] text-base font-bold text-white shadow-[0_8px_24px_rgba(47,94,255,0.32)] hover:bg-[#244de7] sm:text-lg"
                        >
                            {`Next: ${nextLabel}`}
                        </Button>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {onEnhance ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onEnhance}
                                    loading={isEnhancing}
                                    disabled={isEnhanceDisabled}
                                    className="h-12 rounded-[999px] border-[#b8beca] bg-white text-sm font-semibold text-[#111827] hover:bg-[#edf1f7]"
                                >
                                    AI Enhance
                                </Button>
                            ) : null}
                            {onSave ? (
                                <Button
                                    type="button"
                                    onClick={onSave}
                                    loading={isSaving}
                                    className="h-12 rounded-[999px] bg-[#2f5eff] text-sm font-semibold text-white hover:bg-[#244de7]"
                                >
                                    Save Resume
                                </Button>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default React.memo(FormStepper);
