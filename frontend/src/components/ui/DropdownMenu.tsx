import { Ellipsis } from "lucide-react";
import { ReactNode } from "react";

export type DropdownMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
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
        className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-slate-500 hover:bg-slate-100"
        onClick={onToggle}
        type="button"
      >
        {triggerLabel}
      </button>
      {open ? (
        <div className="absolute right-0 top-7 z-20 min-w-[108px] rounded-lg border border-surface-line bg-white p-1 shadow-elev-sm">
          {items.map((item) => (
            <button
              key={item.label}
              className={`w-full rounded-md bg-white px-2 py-1.5 text-left text-sm hover:bg-slate-100 ${
                item.danger ? "text-red-700" : "text-slate-900"
              }`}
              disabled={item.disabled}
              onClick={item.onClick}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
