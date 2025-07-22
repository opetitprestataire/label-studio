import { cn } from "@humansignal/ui";

interface StepperProps {
  steps: { title: string }[];
  currentStep: number;
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <div className="w-full mb-tight py-base bg-neutral-background border-b border-neutral-border px-wide">
      <div className="flex flex-col">
        {/* Step circles and names */}
        <div className="flex justify-between items-start mb-tight">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-body-small border mr-tight",
                  currentStep > index
                    ? "w-8 h-8 rounded-full flex items-center justify-center text-body-small font-semibold transition-all duration-300 bg-primary-surface text-primary-surface-content shadow-sm" // completed
                    : currentStep === index
                      ? "w-8 h-8 rounded-full flex items-center justify-center text-body-small font-semibold transition-all duration-300 bg-primary-surface text-primary-surface-content shadow-sm" // current
                      : "w-8 h-8 rounded-full flex items-center justify-center text-body-small font-semibold transition-all duration-300 bg-neutral-surface border-2 border-neutral-border text-neutral-content-subtle", // upcoming
                )}
              >
                {currentStep > index ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn("text-body-small", currentStep >= index ? "text-primary-content font-semibold" : "text-neutral-content-subtle")}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="relative w-full overflow-hidden rounded-full h-1 bg-neutral-emphasis">
          <div
            className="h-full bg-primary-surface transition-all duration-300 rounded-full"
            style={{
              width: `${(Math.min(currentStep, steps.length - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}; 