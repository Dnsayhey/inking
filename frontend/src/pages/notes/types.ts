import { Note, NoteReminderPayload } from "../../api/notes";

export type NoteFormData = {
  content: string;
};

export type ReminderFormData = NoteReminderPayload;

export type PendingReminder = {
  id: number;
  data: ReminderFormData;
};

export type NotesFilters = {
  archived: boolean;
  search: string;
  tagIds: number[];
};

export type NotesMutationContext = {
  previous: Array<[readonly unknown[], Note[] | undefined]>;
  tempId?: number;
};

export type ReminderDisplayItem = {
  id: number;
  title: string;
  calendar_type: "solar" | "lunar";
  month: number;
  day: number;
  is_leap_month: boolean;
  time_of_day: string;
  timezone: string;
  remind_before_days: number;
  is_active: boolean;
  source: "server" | "local";
};
