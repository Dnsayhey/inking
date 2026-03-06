import { Note } from "../../api/notes";
import { Card, FormError } from "../../components/ui";
import { NoteItemCard } from "./NoteItemCard";

type NotesListProps = {
  notesLoading: boolean;
  notesError: boolean;
  notesErrorMessage: string;
  notes: Note[];
  isArchivedView: boolean;
  emptyText: string;
  openMenuNoteId: number | null;
  onToggleMenu: (noteId: number) => void;
  onEdit: (note: Note) => void;
  onArchive: (noteId: number) => void;
  onUnarchive: (noteId: number) => void;
  archivePending: boolean;
  restorePending: boolean;
  menuEditLabel: string;
  menuArchiveLabel: string;
  menuUnarchiveLabel: string;
  getRelativeTimeLabel: (note: Note) => string;
  reminderCountByNoteId: Record<number, number>;
};

export function NotesList(props: NotesListProps) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {props.notesLoading
        ? Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse p-3.5" tone="default">
              <div className="mb-3 h-3 w-20 rounded bg-slate-200" />
              <div className="mb-2 h-3 w-full rounded bg-slate-200" />
              <div className="h-3 w-5/6 rounded bg-slate-200" />
            </Card>
          ))
        : null}

      {props.notesError ? <FormError>{props.notesErrorMessage}</FormError> : null}

      {!props.notesLoading && props.notes.length === 0 ? <p className="text-[var(--text-secondary)]">{props.emptyText}</p> : null}

      {props.notes.map((note) => (
        <NoteItemCard
          key={note.id}
          archivePending={props.archivePending}
          isArchivedView={props.isArchivedView}
          menuArchiveLabel={props.menuArchiveLabel}
          menuEditLabel={props.menuEditLabel}
          menuUnarchiveLabel={props.menuUnarchiveLabel}
          note={note}
          onArchive={() => props.onArchive(note.id)}
          onEdit={() => props.onEdit(note)}
          onToggleMenu={() => props.onToggleMenu(note.id)}
          onUnarchive={() => props.onUnarchive(note.id)}
          open={props.openMenuNoteId === note.id}
          relativeTimeLabel={props.getRelativeTimeLabel(note)}
          reminderCount={props.reminderCountByNoteId[note.id] ?? 0}
          restorePending={props.restorePending}
        />
      ))}
    </div>
  );
}
