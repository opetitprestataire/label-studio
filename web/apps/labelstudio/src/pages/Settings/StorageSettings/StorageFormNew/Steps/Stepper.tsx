import { cn } from "@humansignal/shad/utils";

interface StepperProps {
  steps: { title: string }[];
  currentStep: number;
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <div
      className="w-full mb-2 py-4"
      style={{
        background: "rgb(248 250 252)",
        padding: "1rem 1.5rem",
        borderBottom: "1px solid var(--color-neutral-border)",
      }}
    >
      <div className="flex flex-col">
        {/* Step circles and names */}
        <div className="flex justify-between items-start mb-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-sm text-sm border mr-2",
                  currentStep > index
                    ? "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200" // completed
                    : currentStep === index
                      ? "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200" // current
                      : "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 bg-white border-2 border-slate-200 text-slate-400", // upcoming
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
              <span className={cn("text-sm", currentStep >= index ? "text-primary font-sm" : "text-muted-foreground")}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="relative w-full overflow-hidden rounded-full h-1 bg-slate-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{
              width: `${(Math.min(currentStep, steps.length - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}; 