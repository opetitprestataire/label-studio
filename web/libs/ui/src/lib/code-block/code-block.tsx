export function CodeBlock({
  code,
  className,
}: {
  title?: string;
  description?: string;
  code: string;
  className?: string;
}) {
  return (
    <div className={`whitespace-pre-wrap font-mono mt-tight p-base bg-neutral-surface rounded-md ${className || ""}`}>
      {code.trim()}
    </div>
  );
}
