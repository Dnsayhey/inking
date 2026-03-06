import { KeyboardEventHandler, MutableRefObject } from "react";
import { AlarmClock, ArrowLeft, Hash } from "lucide-react";
import { UseFormHandleSubmit, UseFormRegister } from "react-hook-form";
import { Tag } from "../../api/tags";
import { FieldError, PrimaryButton, TagChip } from "../../components/ui";
import { NoteFormData } from "./types";

type NoteComposerProps = {
  isArchivedView: boolean;
  onBackHome: () => void;
  backHomeText: string;
  handleSubmit: UseFormHandleSubmit<NoteFormData>;
  onSubmit: (data: NoteFormData) => Promise<void>;
  register: UseFormRegister<NoteFormData>;
  contentError?: string;
  composerPlaceholder: string;
  composerSelectedTags: Tag[];
  onToggleComposerTag: (tagId: number) => void;
  isComposerTagPickerOpen: boolean;
  setIsComposerTagPickerOpen: (open: boolean) => void;
  composerTagKeyword: string;
  setComposerTagKeyword: (value: string) => void;
  composerTagPickerWrapRef: MutableRefObject<HTMLDivElement | null>;
  onComposerTagInputKeyDown: KeyboardEventHandler<HTMLInputElement>;
  composerFilteredTags: Tag[];
  composerTagIds: number[];
  reminderCount: number;
  onOpenReminderModal: () => void;
  saving: boolean;
  isEditing: boolean;
  savingText: string;
  saveChangesText: string;
  saveText: string;
  composerTagPlaceholder: string;
};

export function NoteComposer(props: NoteComposerProps) {
  if (props.isArchivedView) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-slate-50"
        onClick={props.onBackHome}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        {props.backHomeText}
      </button>
    );
  }

  return (
    <form onSubmit={props.handleSubmit(props.onSubmit)}>
      <textarea
        className="min-h-[104px] w-full resize-y rounded-[var(--radius-md)] border border-transparent bg-[var(--bg-panel-muted)] p-3 text-[15px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--line-strong)]"
        placeholder={props.composerPlaceholder}
        rows={4}
        {...props.register("content")}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-h-8 flex-wrap items-center gap-2">
          {props.composerSelectedTags.map((tag) => (
            <TagChip key={tag.id} color={tag.color} onClick={() => props.onToggleComposerTag(tag.id)} variant="muted">
              #{tag.name} ×
            </TagChip>
          ))}

          <div className="relative" ref={props.composerTagPickerWrapRef}>
            {props.isComposerTagPickerOpen ? (
              <input
                autoFocus
                className="h-8 w-40 rounded-full border border-[var(--brand-300)] bg-white px-2.5 text-xs font-semibold text-[var(--brand-700)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]"
                onChange={(e) => props.setComposerTagKeyword(e.target.value)}
                onKeyDown={props.onComposerTagInputKeyDown}
                placeholder={props.composerTagPlaceholder}
                value={props.composerTagKeyword}
              />
            ) : (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[var(--brand-300)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                onClick={() => {
                  props.setComposerTagKeyword("");
                  props.setIsComposerTagPickerOpen(true);
                }}
                type="button"
              >
                <Hash className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}

            {props.isComposerTagPickerOpen && props.composerFilteredTags.length > 0 ? (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-white p-2 shadow-[var(--shadow-md)]">
                <div className="flex max-h-[180px] flex-col gap-1.5 overflow-auto">
                  {props.composerFilteredTags.map((tag) => {
                    const checked = props.composerTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        className={`flex items-center justify-start rounded-[10px] border px-2.5 py-1.5 text-left text-xs ${
                          checked
                            ? "border-[var(--brand-300)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                            : "border-[var(--line-soft)] bg-white text-[var(--text-primary)] hover:bg-slate-50"
                        }`}
                        onClick={() => props.onToggleComposerTag(tag.id)}
                        type="button"
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <button
            className="inline-flex h-8 items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 text-xs font-semibold text-orange-700"
            onClick={props.onOpenReminderModal}
            type="button"
          >
            <AlarmClock className="h-3.5 w-3.5" />
            <span>{props.reminderCount}</span>
          </button>
        </div>

        <PrimaryButton disabled={props.saving} type="submit">
          {props.saving ? props.savingText : props.isEditing ? props.saveChangesText : props.saveText}
        </PrimaryButton>
      </div>

      {props.contentError ? <FieldError>{props.contentError}</FieldError> : null}
    </form>
  );
}
