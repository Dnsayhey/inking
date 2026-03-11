import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getMessageByCode } from "../api/error-messages";
import { toApiError } from "../api/envelope";
import { listTags, mergeTags } from "../api/tags";
import { useToast } from "../components/ui";

export function MergeTagPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [fromTagId, setFromTagId] = useState<number | null>(() => {
    const raw = searchParams.get("fromTagId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [toTagId, setToTagId] = useState<number | null>(null);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });
  const tags = tagsQuery.data ?? [];

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!fromTagId || !toTagId) {
        throw new Error("invalid-merge-payload");
      }
      return mergeTags({ from_tag_id: fromTagId, to_tag_id: toTagId });
    },
    onSuccess: () => {
      showToast("标签合并成功", "success");
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      navigate("/tags", { replace: true });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      showToast(getMessageByCode(apiError.code, apiError.message), "error");
    },
  });

  const toTagOptions = useMemo(() => {
    if (!fromTagId) return tags;
    return tags.filter((item) => item.id !== fromTagId);
  }, [tags, fromTagId]);

  const fromTag = useMemo(() => tags.find((item) => item.id === fromTagId) ?? null, [tags, fromTagId]);
  const toTag = useMemo(() => tags.find((item) => item.id === toTagId) ?? null, [tags, toTagId]);

  const canSubmit = Boolean(fromTag && toTag && fromTag.id !== toTag.id);

  return (
    <div className="flex h-full flex-col gap-5 bg-[#F8FAFC] p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#0F172A]">合并标签</h1>
        <button
          className="inline-flex h-10 w-[132px] items-center justify-center rounded-[10px] bg-[#16A34A] px-4 text-sm font-semibold text-white transition hover:bg-[#15803D]"
          onClick={() => navigate("/tags")}
          type="button"
        >
          返回列表
        </button>
      </header>

      <section className="rounded-[12px] border border-[#E2E8F0] bg-white p-4">
        {tags.length < 2 ? (
          <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
            至少需要两个标签才能执行合并。
          </div>
        ) : null}
        <div className="space-y-[14px]">
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-[#475569]">合并来源</p>
            <select
              className="h-10 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] outline-none focus:border-[#60A5FA]"
              onChange={(event) => {
                const value = Number(event.target.value);
                setFromTagId(Number.isInteger(value) && value > 0 ? value : null);
                if (toTagId === value) {
                  setToTagId(null);
                }
              }}
              value={fromTagId ?? ""}
            >
              <option value="" disabled>
                请选择
              </option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  #{tag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-[#475569]">合并目标</p>
            <select
              className="h-10 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] outline-none focus:border-[#60A5FA]"
              onChange={(event) => {
                const value = Number(event.target.value);
                setToTagId(Number.isInteger(value) && value > 0 ? value : null);
              }}
              value={toTagId ?? ""}
            >
              <option value="" disabled>
                请选择
              </option>
              {toTagOptions.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  #{tag.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
            该操作会将来源标签的关联笔记迁移到目标标签，并删除来源标签。
            {fromTag ? ` 来源：#${fromTag.name}` : ""}
            {toTag ? `，目标：#${toTag.name}` : ""}
          </div>
        </div>

        <div className="mt-5 flex h-10 items-center justify-end gap-3">
          <button
            className="inline-flex h-10 w-24 items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-[#F1F5F9] text-sm text-[#334155] transition hover:bg-[#E2E8F0]"
            onClick={() => navigate("/tags")}
            type="button"
          >
            取消
          </button>
          <button
            className="inline-flex h-10 w-24 items-center justify-center rounded-[10px] bg-[#DC2626] text-sm font-semibold text-white transition hover:bg-[#B91C1C] disabled:opacity-60"
            disabled={!canSubmit || tags.length < 2 || mergeMutation.isPending}
            onClick={() => mergeMutation.mutate()}
            type="button"
          >
            {mergeMutation.isPending ? "合并中..." : "确认合并"}
          </button>
        </div>
      </section>
    </div>
  );
}
