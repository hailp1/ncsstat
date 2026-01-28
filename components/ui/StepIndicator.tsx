import React from 'react';
import { Check } from 'lucide-react';

interface Step {
    id: string;
    label: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: string;
    onStepClick?: (stepId: string) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="w-full py-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isUpcoming = index > currentIndex;
                        const isClickable = (isCompleted || isCurrent) && onStepClick;

                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex flex-col items-center">
                                    <button
                                        type="button"
                                        onClick={() => isClickable && onStepClick(step.id)}
                                        disabled={isUpcoming || !onStepClick}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${isCompleted
                                                ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-110 cursor-pointer'
                                                : isCurrent
                                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 hover:ring-indigo-200 cursor-pointer'
                                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            } ${isClickable ? 'hover:shadow-lg' : ''}`}
                                        title={isClickable ? `Quay lại: ${step.label}` : undefined}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </button>
                                    <span
                                        className={`mt-2 text-xs font-medium ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-slate-500'
                                            } ${isClickable ? 'cursor-pointer hover:underline' : ''}`}
                                        onClick={() => isClickable && onStepClick(step.id)}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`flex-1 h-0.5 mx-4 transition-all ${isCompleted ? 'bg-green-500' : 'bg-slate-200'
                                            }`}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
