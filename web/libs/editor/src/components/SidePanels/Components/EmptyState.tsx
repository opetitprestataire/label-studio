import type React from "react";
import { IconExternal } from "@humansignal/ui";

interface EmptyStateProps {
  icon: React.ReactNode;
  header: string;
  description: React.ReactNode;
  learnMore?: {
    href: string;
    text: string;
    testId?: string;
  };
}

declare global {
  interface Window {
    APP_SETTINGS?: {
      whitelabel_is_active?: boolean;
      [key: string]: any;
    };
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, header, description, learnMore }) => {
  // White-label check for docs link hiding
  const isWhiteLabel = typeof window !== "undefined" && window.APP_SETTINGS?.whitelabel_is_active === true;

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 w-full">
      <div className="flex items-center justify-center bg-primary-background text-primary-icon rounded-full p-2 mb-2">
        {icon}
      </div>
      <div className="flex flex-col items-center w-full gap-1">
        <div className="font-medium text-body-medium leading-tight text-center text-neutral-content">{header}</div>
        <div className="text-body-small text-neutral-content-subtler text-center w-full">{description}</div>
      </div>
      {learnMore && !isWhiteLabel && (
        <div className="flex justify-center items-center w-full pt-tight mt-tight">
          <a
            href={learnMore.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-body-small text-primary-link hover:underline"
            {...(learnMore.testId ? { "data-testid": learnMore.testId } : {})}
          >
            {learnMore.text}
            <IconExternal width={16} height={16} className="ml-1" />
          </a>
        </div>
      )}
    </div>
  );
};
