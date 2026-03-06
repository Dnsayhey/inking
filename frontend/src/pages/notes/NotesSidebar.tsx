import { KeyboardEventHandler } from "react";
import { Plus } from "lucide-react";
import { Tag } from "../../api/tags";
import { Card, FieldError, TagChip, TextInput } from "../../components/ui";

type NotesSidebarProps = {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  searchPlaceholder: string;
  tags: Tag[];
  selectedTagIds: number[];
  onToggleTagFilter: (tagId: number) => void;
  isTagInputOpen: boolean;
  newTagName: string;
  setNewTagName: (value: string) => void;
  openTagInput: () => void;
  closeTagInput: () => void;
  onTagInputKeyDown: KeyboardEventHandler<HTMLInputElement>;
  createTagPending: boolean;
  createTagError: boolean;
  createTagErrorMessage: string;
  tagsTitle: string;
  newTagPlaceholder: string;
};

export function NotesSidebar(props: NotesSidebarProps) {
  return (
    <>
      <TextInput
        onChange={(e) => props.onSearchTextChange(e.target.value)}
        placeholder={props.searchPlaceholder}
        value={props.searchText}
      />

      <Card className="mt-4 p-3" tone="muted">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{props.tagsTitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {props.tags.map((tag) => {
            const selected = props.selectedTagIds.includes(tag.id);
            return (
              <TagChip
                key={tag.id}
                color={tag.color}
                onClick={() => props.onToggleTagFilter(tag.id)}
                variant={selected ? "filterSelected" : "filter"}
              >
                #{tag.name}
              </TagChip>
            );
          })}

          {props.isTagInputOpen ? (
            <input
              autoFocus
              className="h-8 w-28 rounded-full border border-[var(--brand-300)] bg-white px-2.5 text-xs font-semibold text-[var(--brand-700)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]"
              onBlur={() => {
                if (!props.createTagPending) {
                  props.closeTagInput();
                  props.setNewTagName("");
                }
              }}
              onChange={(e) => props.setNewTagName(e.target.value)}
              onKeyDown={props.onTagInputKeyDown}
              placeholder={props.newTagPlaceholder}
              value={props.newTagName}
            />
          ) : (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[var(--brand-300)] bg-[var(--brand-50)] text-[var(--brand-700)]"
              onClick={props.openTagInput}
              type="button"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
        {props.createTagError ? <FieldError>{props.createTagErrorMessage}</FieldError> : null}
      </Card>
    </>
  );
}
