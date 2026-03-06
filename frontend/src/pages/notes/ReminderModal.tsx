import { Pencil, Trash2, X } from "lucide-react";
import { PrimaryButton, TextInput } from "../../components/ui";
import { ReminderDisplayItem, ReminderFormData } from "./types";

type ReminderModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  loadingText: string;
  reminderEmptyText: string;
  draftEmptyText: string;
  draftHintText: string;
  remindersLoading: boolean;
  hasServerReminders: boolean;
  items: ReminderDisplayItem[];
  editingNoteId: number | null;
  onToggleActive: (item: ReminderDisplayItem) => void;
  onEditItem: (item: ReminderDisplayItem) => void;
  onDeleteItem: (item: ReminderDisplayItem) => void;
  reminderForm: ReminderFormData;
  setReminderForm: (updater: (prev: ReminderFormData) => ReminderFormData) => void;
  editingReminderId: number | null;
  reminderEditLabel: string;
  reminderCreateLabel: string;
  calendarSolarText: string;
  calendarLunarText: string;
  remindBeforeDaysText: (count: number) => string;
  leapMonthText: string;
  activeText: string;
  inactiveText: string;
  cancelEditText: string;
  saveChangesText: string;
  reminderAddText: string;
  reminderTitlePlaceholder: string;
  onSaveReminder: () => void;
  onCancelEdit: () => void;
  savePending: boolean;
};

export function ReminderModal(props: ReminderModalProps) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-2xl rounded-[var(--radius-lg)] border border-[var(--line-soft)] bg-white p-4 shadow-[var(--shadow-lg)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{props.title}</h2>
          <button
            className="rounded-[10px] p-1.5 text-[var(--text-muted)] transition hover:bg-slate-100 hover:text-[var(--text-secondary)]"
            onClick={props.onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 max-h-[280px] space-y-2 overflow-auto rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-[var(--bg-panel-muted)] p-2.5">
          {props.editingNoteId && props.remindersLoading ? <p className="text-sm text-[var(--text-muted)]">{props.loadingText}</p> : null}
          {props.editingNoteId && !props.remindersLoading && !props.hasServerReminders ? (
            <p className="text-sm text-[var(--text-muted)]">{props.reminderEmptyText}</p>
          ) : null}
          {!props.editingNoteId && props.items.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{props.draftEmptyText}</p>
          ) : null}

          {props.items.map((reminder) => (
            <div key={reminder.id} className="rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-white p-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{reminder.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {reminder.calendar_type === "lunar" ? props.calendarLunarText : props.calendarSolarText} · {reminder.month}/
                    {reminder.day} · {reminder.time_of_day.slice(0, 5)} · {props.remindBeforeDaysText(reminder.remind_before_days)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className={`rounded-[10px] px-2 py-1 text-xs font-semibold ${
                      reminder.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                    onClick={() => props.onToggleActive(reminder)}
                    type="button"
                  >
                    {reminder.is_active ? props.activeText : props.inactiveText}
                  </button>
                  <button
                    className="rounded-[10px] p-1.5 text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--text-secondary)]"
                    onClick={() => props.onEditItem(reminder)}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="rounded-[10px] p-1.5 text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => props.onDeleteItem(reminder)}
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--line-soft)] p-3">
          <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            {props.editingReminderId ? props.reminderEditLabel : props.reminderCreateLabel}
          </p>
          {!props.editingNoteId ? <p className="mb-2 text-xs text-[var(--text-muted)]">{props.draftHintText}</p> : null}

          <div className="grid gap-2 md:grid-cols-2">
            <TextInput
              onChange={(e) => props.setReminderForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={props.reminderTitlePlaceholder}
              value={props.reminderForm.title}
            />
            <select
              className="h-10 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]"
              onChange={(e) =>
                props.setReminderForm((prev) => ({
                  ...prev,
                  calendar_type: e.target.value as "solar" | "lunar",
                  is_leap_month: e.target.value === "lunar" ? prev.is_leap_month : false,
                }))
              }
              value={props.reminderForm.calendar_type}
            >
              <option value="solar">{props.calendarSolarText}</option>
              <option value="lunar">{props.calendarLunarText}</option>
            </select>
            <TextInput
              onChange={(e) => props.setReminderForm((prev) => ({ ...prev, month: Number(e.target.value || 1) }))}
              type="number"
              value={String(props.reminderForm.month)}
            />
            <TextInput
              onChange={(e) => props.setReminderForm((prev) => ({ ...prev, day: Number(e.target.value || 1) }))}
              type="number"
              value={String(props.reminderForm.day)}
            />
            <TextInput
              onChange={(e) => props.setReminderForm((prev) => ({ ...prev, time_of_day: e.target.value }))}
              type="time"
              value={props.reminderForm.time_of_day}
            />
            <select
              className="h-10 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]"
              onChange={(e) => props.setReminderForm((prev) => ({ ...prev, remind_before_days: Number(e.target.value) }))}
              value={String(props.reminderForm.remind_before_days)}
            >
              <option value="0">{props.remindBeforeDaysText(0)}</option>
              <option value="1">{props.remindBeforeDaysText(1)}</option>
              <option value="3">{props.remindBeforeDaysText(3)}</option>
              <option value="7">{props.remindBeforeDaysText(7)}</option>
            </select>
            {props.reminderForm.calendar_type === "lunar" ? (
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  checked={props.reminderForm.is_leap_month}
                  onChange={(e) => props.setReminderForm((prev) => ({ ...prev, is_leap_month: e.target.checked }))}
                  type="checkbox"
                />
                {props.leapMonthText}
              </label>
            ) : null}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            {props.editingReminderId ? (
              <PrimaryButton onClick={props.onCancelEdit} type="button" variant="secondary">
                {props.cancelEditText}
              </PrimaryButton>
            ) : null}
            <PrimaryButton disabled={props.savePending} onClick={props.onSaveReminder} type="button">
              {props.editingReminderId ? props.saveChangesText : props.reminderAddText}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
