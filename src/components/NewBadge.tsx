// components/NewBadge.tsx
export function NewBadge() {
  return (
    <span className="relative ml-1.5 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      <span className="absolute -left-0.5 -top-0.5 h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
      <span className="absolute -left-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
      <span className="ml-1.5">New</span>
    </span>
  );
}