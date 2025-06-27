export function CodeBlock({
  code,
  className,
  variant = "default",
}: {
  title?: string;
  description?: string;
  code: string;
  className?: string;
  variant?: "default" | "warning" | "negative";
}) {
  const variantStyles = {
    default: "bg-neutral-surface border-neutral-border",
    warning: "bg-warning-background border-warning-border-subtle",
    negative: "bg-negative-background border-negative-border-subtle",
  };

  return (
    <div
      className={`whitespace-pre-wrap font-mono mt-2 p-3 rounded-md border  scrollbar-thin scrollbar-thumb-neutral-border-bold scrollbar-track-transparent ${variantStyles[variant]} ${className || ""}`}
    >
      {code.trim()}
    </div>
  );
}
