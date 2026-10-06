import { cn } from "cn";

/** A selectable card used by the specialist and service steps. */
export function OptionCard({
  selected,
  onSelect,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
      )}
    >
      <span className="font-medium">{title}</span>
      {subtitle && <span className="text-muted-foreground text-xs">{subtitle}</span>}
    </button>
  );
}

export function StepMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground py-6 text-center text-sm">{children}</p>;
}
