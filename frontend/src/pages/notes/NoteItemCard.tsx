import { AlarmClock, ArchiveRestore, ArchiveX, Pencil } from "lucide-react";
import { Note } from "../../api/notes";
import { Card, DropdownMenu, DropdownMenuItem, TagChip } from "../../components/ui";

type NoteItemCardProps = {
  note: Note;
  isArchivedView: boolean;
  open: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  archivePending: boolean;
  restorePending: boolean;
  menuEditLabel: string;
  menuArchiveLabel: string;
  menuUnarchiveLabel: string;
  relativeTimeLabel: string;
  reminderCount: number;
};

export function NoteItemCard(props: NoteItemCardProps) {
  const items: DropdownMenuItem[] = props.isArchivedView
    ? [
        {
          label: props.menuUnarchiveLabel,
          icon: <ArchiveRestore className="h-3.5 w-3.5" />,
          disabled: props.restorePending,
          onClick: props.onUnarchive,
        },
      ]
    : [
        {
          label: props.menuEditLabel,
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: props.onEdit,
        },
        {
          label: props.menuArchiveLabel,
          icon: <ArchiveX className="h-3.5 w-3.5" />,
          danger: true,
          disabled: props.archivePending,
          onClick: props.onArchive,
        },
      ];

  return (
    <Card className="p-3.5" tone="default">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">{props.relativeTimeLabel}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
            <AlarmClock className="h-3 w-3" />
            {props.reminderCount}
          </span>
        </div>
        <DropdownMenu items={items} onToggle={props.onToggleMenu} open={props.open} />
      </div>

      <p className="mb-2 whitespace-pre-wrap text-[var(--text-primary)]">{props.note.content}</p>
      <div className="flex flex-wrap gap-1.5">
        {props.note.tags.map((tag) => (
          <TagChip key={tag.id} color={tag.color} variant="muted">
            #{tag.name}
          </TagChip>
        ))}
      </div>
    </Card>
  );
}
