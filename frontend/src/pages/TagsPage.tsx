import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listNotes } from "../api/notes";
import { listTags } from "../api/tags";
import { TagListPanel } from "./tags-shared";

export function TagsPage() {
  const navigate = useNavigate();
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });
  const notesQuery = useQuery({
    queryKey: ["notes", { archived: false }],
    queryFn: () => listNotes({ archived: false }),
  });

  const tags = tagsQuery.data ?? [];
  const notes = notesQuery.data ?? [];

  useEffect(() => {
    if (tags.length === 0) {
      setSelectedTagId(null);
      return;
    }
    setSelectedTagId((current) => {
      if (current && tags.some((tag) => tag.id === current)) {
        return current;
      }
      return tags[0].id;
    });
  }, [tags]);

  const selectedTag = useMemo(
    () => tags.find((item) => item.id === selectedTagId) ?? null,
    [tags, selectedTagId],
  );

  const selectedTagNotes = useMemo(() => {
    if (!selectedTag) return [];
    return notes.filter((note) => note.tags.some((tag) => tag.id === selectedTag.id));
  }, [notes, selectedTag]);

  const linkedNotesCount = notes.filter((note) => note.tags.length > 0).length;

  return (
    <div className="flex h-full flex-col gap-5 bg-[#F8FAFC] p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#0F172A]">标签</h1>
        <button
          className="inline-flex h-10 w-[132px] items-center justify-center rounded-[10px] bg-[#16A34A] px-4 text-sm font-semibold text-white transition hover:bg-[#15803D]"
          onClick={() => navigate("/tags/new")}
          type="button"
        >
          + 新建标签
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="h-[96px] rounded-[12px] border border-[#E2E8F0] bg-white p-3">
          <p className="text-[28px] font-bold text-[#0F172A]">{tags.length}</p>
          <p className="text-[13px] text-[#64748B]">标签总数</p>
        </div>
        <div className="h-[96px] rounded-[12px] border border-[#E2E8F0] bg-white p-3">
          <p className="text-[28px] font-bold text-[#0F172A]">{linkedNotesCount}</p>
          <p className="text-[13px] text-[#64748B]">已关联笔记</p>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] gap-3">
        <TagListPanel
          getTagNoteCount={(tagId) => notes.filter((note) => note.tags.some((tag) => tag.id === tagId)).length}
          onEditTag={(tagId) => navigate(`/tags/${tagId}/edit`)}
          onMergeFromTag={(tagId) => navigate(`/tags/merge?fromTagId=${tagId}`)}
          onSelect={setSelectedTagId}
          selectedTagId={selectedTagId}
          tags={tags}
        />

        <article className="flex min-h-0 flex-col rounded-[12px] border border-[#E2E8F0] bg-white p-4">
          {!selectedTag ? (
            <div className="flex h-full items-center justify-center text-sm text-[#64748B]">请选择标签</div>
          ) : (
            <>
              <h2 className="text-[18px] font-bold text-[#0F172A]">#{selectedTag.name} 下的笔记</h2>
              <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
                {selectedTagNotes.length > 0 ? (
                  <div className="space-y-1.5 text-[14px] leading-[1.6] text-[#334155]">
                    {selectedTagNotes.map((note) => (
                      <p key={note.id}>- {note.title || "无标题"}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">暂无关联笔记</p>
                )}
              </div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
