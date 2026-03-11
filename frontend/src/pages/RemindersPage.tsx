import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getMessageByCode } from "../api/error-messages";
import { toApiError } from "../api/envelope";
import {
  createNoteReminder,
  listNoteReminders,
  listNotes,
  NoteReminderPayload,
} from "../api/notes";
import { useToast } from "../components/ui";

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function reminderDateLabel(month: number, day: number, time: string) {
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return `${paddedMonth}/${paddedDay} ${time.slice(0, 5)}`;
}

function reminderInputValue(month: number, day: number, time: string) {
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${time.slice(0, 5)}`;
}

export function RemindersPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(() => {
    const noteId = searchParams.get("noteId");
    if (!noteId) return null;
    const parsed = Number(noteId);
    return Number.isInteger(parsed) ? parsed : null;
  });

  const [form, setForm] = useState<NoteReminderPayload>({
    title: "",
    calendar_type: "solar",
    month: 1,
    day: 1,
    is_leap_month: false,
    time_of_day: "09:00",
    timezone: "Asia/Shanghai",
    remind_before_days: 0,
    is_active: true,
  });
  const [timeInput, setTimeInput] = useState(() => reminderInputValue(1, 1, "09:00"));

  const notesQuery = useQuery({
    queryKey: ["notes", { archived: false }],
    queryFn: () => listNotes({ archived: false }),
  });

  const notes = notesQuery.data ?? [];

  useEffect(() => {
    if (notes.length === 0) {
      setSelectedNoteId(null);
      return;
    }
    setSelectedNoteId((current) => {
      if (current && notes.some((item) => item.id === current)) {
        return current;
      }
      return notes[0].id;
    });
  }, [notes]);

  useEffect(() => {
    setTimeInput(reminderInputValue(form.month, form.day, form.time_of_day));
  }, [form.day, form.month, form.time_of_day]);

  const remindersQuery = useQuery({
    queryKey: ["reminders", selectedNoteId],
    queryFn: () => listNoteReminders(selectedNoteId as number),
    enabled: selectedNoteId !== null,
  });

  const reminders = remindersQuery.data ?? [];
  const selectedNote = useMemo(
    () => notes.find((item) => item.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNoteId) return;
      const noteTitle = selectedNote?.title || "无标题";
      const advanceLabel = form.remind_before_days === 0 ? "提前30分钟" : `提前${form.remind_before_days}天`;
      return createNoteReminder(selectedNoteId, {
        ...form,
        title: `${noteTitle} - ${advanceLabel}`,
        time_of_day: normalizeTime(form.time_of_day),
      });
    },
    onSuccess: () => {
      showToast("提醒创建成功", "success");
      void queryClient.invalidateQueries({ queryKey: ["reminders", selectedNoteId] });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      showToast(getMessageByCode(apiError.code, apiError.message), "error");
    },
  });

  const canCreate = Boolean(selectedNoteId && form.month >= 1 && form.day >= 1 && form.time_of_day.trim());

  return (
    <div className="flex h-full flex-col gap-5 bg-[#F8FAFC] p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#0F172A]">提醒</h1>
        <button
          className="inline-flex h-10 w-[128px] items-center justify-center rounded-[10px] bg-[#DC2626] px-4 text-sm font-semibold text-white transition hover:bg-[#B91C1C] disabled:opacity-60"
          disabled={createMutation.isPending || !canCreate}
          onClick={() => createMutation.mutate()}
          type="button"
        >
          + 新建提醒
        </button>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-[14px]">
        <aside className="min-h-0 space-y-3 rounded-[12px] border border-[#E2E8F0] bg-white p-[14px]">
          <label className="block space-y-1">
            <span className="text-[15px] font-semibold text-[#0F172A]">关联笔记</span>
            <select
              className="h-[46px] w-full rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[14px] text-[#0F172A] outline-none focus:border-[#60A5FA]"
              onChange={(event) => setSelectedNoteId(Number(event.target.value))}
              value={selectedNoteId ?? ""}
            >
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title || "无标题"}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-[#0F172A]">提醒时间</span>
              <div className="flex h-7 items-center gap-[3px] rounded-[9px] border border-[#CBD5E1] bg-[#F1F5F9] p-[2px]">
                <button
                  className={`inline-flex h-[22px] min-w-[38px] items-center justify-center rounded-[7px] px-2 text-[12px] font-medium ${
                    form.calendar_type === "solar" ? "bg-white text-[#0F172A]" : "text-[#64748B]"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, calendar_type: "solar" }))}
                  type="button"
                >
                  公历
                </button>
                <button
                  className={`inline-flex h-[22px] min-w-[38px] items-center justify-center rounded-[7px] px-2 text-[12px] font-medium ${
                    form.calendar_type === "lunar" ? "bg-white text-[#0F172A]" : "text-[#64748B]"
                  }`}
                  onClick={() => setForm((prev) => ({ ...prev, calendar_type: "lunar" }))}
                  type="button"
                >
                  农历
                </button>
              </div>
            </div>
            <input
              className="h-[46px] w-full rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[14px] text-[#0F172A] outline-none focus:border-[#60A5FA]"
              onChange={(event) => {
                const normalized = event.target.value.replace("T", " ");
                setTimeInput(normalized);
                const matches = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
                if (matches) {
                  const [, , month, day, hour, minute] = matches;
                  setForm((prev) => ({
                    ...prev,
                    month: Number(month),
                    day: Number(day),
                    time_of_day: `${hour}:${minute}`,
                  }));
                }
              }}
              placeholder="2026-03-06 14:00"
              value={timeInput}
            />
          </div>

          <label className="block space-y-1">
            <span className="text-[15px] font-semibold text-[#0F172A]">提前提醒时间</span>
            <select
              className="h-[46px] w-full rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[14px] text-[#0F172A] outline-none focus:border-[#60A5FA]"
              onChange={(event) => setForm((prev) => ({ ...prev, remind_before_days: Number(event.target.value) }))}
              value={form.remind_before_days}
            >
              <option value={0}>提前30分钟</option>
              <option value={1}>提前 1 天</option>
              <option value={3}>提前 3 天</option>
              <option value={7}>提前 7 天</option>
            </select>
          </label>

          <div className="space-y-1">
            <span className="text-[15px] font-semibold text-[#0F172A]">重复规则</span>
            <input
              className="h-[46px] w-full rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[14px] text-[#0F172A] outline-none focus:border-[#60A5FA]"
              readOnly
              value="仅一次"
            />
          </div>

          <button
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white transition hover:bg-[#B91C1C] disabled:opacity-60"
            disabled={createMutation.isPending || !canCreate}
            onClick={() => createMutation.mutate()}
            type="button"
          >
            保存提醒
          </button>
        </aside>

        <article className="min-h-0 rounded-[12px] border border-[#E2E8F0] bg-white p-[14px]">
          <h2 className="text-[18px] font-bold text-[#0F172A]">已创建提醒</h2>

          <div className="mt-2 min-h-0 space-y-2 overflow-y-auto">
            {reminders.length === 0 ? <p className="text-sm text-[#64748B]">暂无提醒</p> : null}
            {reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-[10px]">
                <p className="text-[15px] font-semibold text-[#7F1D1D]">{reminder.title}</p>
                <p className="mt-1 text-xs text-[#B91C1C]">
                  {reminderDateLabel(reminder.month, reminder.day, reminder.time_of_day)} · 仅一次 · 来源笔记：
                  {selectedNote?.title || "无标题"}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
