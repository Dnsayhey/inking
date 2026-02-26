import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createNote, deleteNote, listNotes, updateNote } from "../api/notes";

const noteSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(255, "标题最长 255"),
  content: z.string().min(1, "内容不能为空"),
});

type NoteFormData = z.infer<typeof noteSchema>;

export function NotesPage() {
  const queryClient = useQueryClient();
  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: listNotes,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      reset();
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: number; data: NoteFormData }) => updateNote(noteId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const onSubmit = (data: NoteFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">新增笔记</h2>
          <p className="panel-subtitle">标题和内容都是必填，创建后会立即刷新列表。</p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <input className="field-input" placeholder="笔记标题" {...register("title")} />
            {errors.title ? <p className="field-error">{errors.title.message}</p> : null}
          </div>

          <div>
            <textarea className="field-input" placeholder="笔记内容" rows={3} {...register("content")} />
            {errors.content ? <p className="field-error">{errors.content.message}</p> : null}
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? "提交中..." : "创建笔记"}
            </button>
            {createMutation.isError ? <p className="form-error">创建失败，请稍后重试</p> : null}
            {createMutation.isSuccess ? <p className="form-success">创建成功</p> : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">笔记列表</h2>
          <p className="panel-subtitle">可直接在列表中编辑标题和内容，也可删除。</p>
        </div>

        {notesQuery.isLoading ? <p>加载中...</p> : null}
        {notesQuery.isError ? <p className="form-error">加载失败，请刷新重试</p> : null}
        {notesQuery.data && notesQuery.data.length === 0 ? <p className="text-slate-600">暂无笔记，先创建一个吧。</p> : null}

        <ul className="space-y-3">
          {notesQuery.data?.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isUpdating={updateMutation.isPending}
              isDeleting={deleteMutation.isPending}
              onUpdate={(data) => updateMutation.mutate({ noteId: note.id, data })}
              onDelete={() => deleteMutation.mutate(note.id)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function NoteItem({
  note,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  note: { id: number; title: string; content: string };
  onUpdate: (data: NoteFormData) => void;
  onDelete: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: note.title,
      content: note.content,
    },
  });

  return (
    <li className="note-card">
      <form className="space-y-2" onSubmit={handleSubmit(onUpdate)}>
        <input className="field-input" {...register("title")} />
        {errors.title ? <p className="field-error">{errors.title.message}</p> : null}

        <textarea className="field-input" rows={2} {...register("content")} />
        {errors.content ? <p className="field-error">{errors.content.message}</p> : null}

        <div className="note-actions">
          <button className="btn-primary" disabled={!isDirty || isUpdating} type="submit">
            {isUpdating ? "保存中..." : "保存"}
          </button>
          <button className="btn-danger" disabled={isDeleting} onClick={onDelete} type="button">
            {isDeleting ? "删除中..." : "删除"}
          </button>
        </div>
      </form>
    </li>
  );
}
