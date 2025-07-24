import { cn } from "@humansignal/ui";

interface StepperProps {
  steps: { title: string }[];
  currentStep: number;
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  // Calculate progress that aligns with circle centers
  const calculateProgressWidth = () => {
    if (currentStep === 0) return 0;
    if (currentStep >= steps.length - 1) return 100;

    // Calculate the position of the current step circle (left edge)
    const stepWidth = 100 / (steps.length - 1);
    // Stop at the current step's circle, not extend to the next step
    const progressToCurrentStep = currentStep * stepWidth;

    return Math.max(0, Math.min(100, progressToCurrentStep));
  };

  // Calculate circle position accounting for grid gaps
  const calculateCirclePosition = (index: number) => {
    // For 4 steps: 0%, 33.33%, 66.67%, 100%
    const stepWidth = 100 / (steps.length - 1);
    return index * stepWidth;
  };

  return (
    <div className="w-full mb-tight py-base bg-neutral-background border-b border-neutral-border px-wide">
      <div className="flex flex-col">
        {/* Step titles at the top */}
        <div className="grid grid-cols-4 mb-tight">
          {steps.map((step, index) => (
            <div key={index} className="text-left">
              <span
                className={cn(
                  "text-body-small",
                  currentStep >= index ? "text-primary-content font-semibold" : "text-neutral-content-subtle",
                )}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar with integrated circles */}
        <div className="relative w-full h-6 flex items-center">
          {/* Background progress bar */}
          <div className="absolute inset-y-0 right-0 h-1 bg-neutral-emphasis rounded-full my-auto left-0" />

          {/* Progress fill */}
          <div
            className="absolute inset-y-0 h-1 left-0 bg-primary-surface transition-all duration-300 rounded-full my-auto "
            style={{
              width: `calc(${calculateProgressWidth()}% - 65px)`,
            }}
          />

          {/* Step circles positioned along the progress bar */}
          <div className="w-full grid grid-cols-4 absolute justify-center">
            {steps.map((step, index) => (
              <div key={index}>
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-body-small border-2 transition-all duration-300",
                    currentStep > index
                      ? "bg-primary-surface text-primary-surface-content shadow-sm border-primary-surface" // completed
                      : currentStep === index
                        ? "bg-primary-surface text-primary-surface-content shadow-sm border-primary-surface" // current
                        : "bg-neutral-surface border-neutral-border text-neutral-content-subtle", // upcoming
                  )}
                >
                  {currentStep > index ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3 h-3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
