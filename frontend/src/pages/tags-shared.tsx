import { Pencil, Shuffle } from "lucide-react";

import { Tag } from "../api/tags";

export const TAG_COLORS = [
  "#F87171",
  "#FBBF24",
  "#A3E635",
  "#60A5FA",
  "#A78BFA",
  "#F472B6",
  "#22D3EE",
  "#FB923C",
  "#94A3B8",
  "#14B8A6",
  "#6366F1",
];

type TagColorPickerProps = {
  value: string | null;
  onChange: (color: string) => void;
};

export function TagColorPicker({ value, onChange }: TagColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLORS.map((color) => (
        <button
          key={color}
          className={`h-5 w-5 rounded-[5px] transition ${value === color ? "ring-2 ring-[#2563EB]" : ""}`}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          type="button"
        />
      ))}
    </div>
  );
}

type TagListPanelProps = {
  tags: Tag[];
  selectedTagId: number | null;
  onSelect: (tagId: number) => void;
  getTagNoteCount: (tagId: number) => number;
  onEditTag?: (tagId: number) => void;
  onMergeFromTag?: (tagId: number) => void;
};

export function TagListPanel({
  tags,
  selectedTagId,
  onSelect,
  getTagNoteCount,
  onEditTag,
  onMergeFromTag,
}: TagListPanelProps) {
  return (
    <aside className="min-h-0 space-y-2.5 overflow-y-auto rounded-[12px] border border-[#E2E8F0] bg-white p-3">
      {tags.map((tag) => {
        const active = tag.id === selectedTagId;
        const bgColor = tag.color ?? "#E2E8F0";
        const tinted = `${bgColor}${active ? "4D" : "33"}`;
        return (
          <div key={tag.id} className="group relative h-[44px]">
            <button
              className="flex h-full w-full items-center justify-between rounded-[8px] px-3 text-sm transition"
              onClick={() => onSelect(tag.id)}
              style={{ backgroundColor: tinted }}
              type="button"
            >
              <span className="font-semibold text-[#0F172A]">#{tag.name}</span>
              <span className={`text-[13px] ${active ? "text-[#1E3A8A]" : "text-[#334155]"}`}>{getTagNoteCount(tag.id)}</span>
            </button>
            {!active ? (
              <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  className="pointer-events-auto inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/85 text-[#475569] transition hover:bg-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditTag?.(tag.id);
                  }}
                  type="button"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  className="pointer-events-auto inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/85 text-[#475569] transition hover:bg-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMergeFromTag?.(tag.id);
                  }}
                  type="button"
                >
                  <Shuffle className="h-3 w-3" />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}
