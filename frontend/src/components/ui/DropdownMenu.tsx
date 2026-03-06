import { Ellipsis } from "lucide-react";
import { ReactNode } from "react";

export type DropdownMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

type DropdownMenuProps = {
  open: boolean;
  onToggle: () => void;
  items: DropdownMenuItem[];
  triggerLabel?: ReactNode;
};

export function DropdownMenu({
  open,
  onToggle,
  items,
  triggerLabel = <Ellipsis className="h-4 w-4" strokeWidth={2.5} />,
}: DropdownMenuProps) {
  return (
    <div className="memo-menu-wrap relative">
      <button
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-transparent bg-transparent text-[var(--text-muted)] transition hover:border-[var(--line-soft)] hover:bg-white hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]"
        onClick={onToggle}
        type="button"
      >
        {triggerLabel}
      </button>
      {open ? (
        <div className="absolute right-0 top-9 z-30 min-w-[148px] rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-white p-1.5 shadow-[var(--shadow-md)]">
          {items.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm transition ${
                item.danger
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-[var(--text-primary)] hover:bg-slate-100"
              }`}
              disabled={item.disabled}
              onClick={item.onClick}
              type="button"
            >
              {item.icon ?? null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
