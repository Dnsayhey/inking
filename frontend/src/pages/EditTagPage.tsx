import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getMessageByCode } from "../api/error-messages";
import { toApiError } from "../api/envelope";
import { listTags, updateTag } from "../api/tags";
import { useToast } from "../components/ui";
import { TAG_COLORS, TagColorPicker } from "./tags-shared";

export function EditTagPage() {
  const navigate = useNavigate();
  const { tagId } = useParams();
  const parsedTagId = Number(tagId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(TAG_COLORS[0]);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });

  const tag = (tagsQuery.data ?? []).find((item) => item.id === parsedTagId) ?? null;

  useEffect(() => {
    if (!tag) return;
    setName(tag.name);
    setColor(tag.color ?? TAG_COLORS[0]);
  }, [tag]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tag) return;
      return updateTag(tag.id, {
        name: name.trim(),
        color,
      });
    },
    onSuccess: () => {
      showToast("标签已更新", "success");
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      navigate("/tags", { replace: true });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      showToast(getMessageByCode(apiError.code, apiError.message), "error");
    },
  });

  return (
    <div className="flex h-full flex-col gap-5 bg-[#F8FAFC] p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#0F172A]">编辑标签</h1>
        <button
          className="inline-flex h-10 w-[132px] items-center justify-center rounded-[10px] bg-[#16A34A] px-4 text-sm font-semibold text-white transition hover:bg-[#15803D]"
          onClick={() => navigate("/tags")}
          type="button"
        >
          返回列表
        </button>
      </header>

      <section className="rounded-[12px] border border-[#E2E8F0] bg-white p-4">
        {!tag ? (
          <p className="text-sm text-[#64748B]">标签不存在</p>
        ) : (
          <>
            <div className="space-y-[14px]">
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-[#475569]">名称</p>
                <input
                  className="h-10 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] outline-none focus:border-[#60A5FA]"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="标签名"
                  value={name}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-[#475569]">颜色</p>
                <TagColorPicker onChange={setColor} value={color} />
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
                className="inline-flex h-10 w-24 items-center justify-center rounded-[10px] bg-[#16A34A] text-sm font-semibold text-white transition hover:bg-[#15803D] disabled:opacity-60"
                disabled={updateMutation.isPending || !name.trim()}
                onClick={() => updateMutation.mutate()}
                type="button"
              >
                保存修改
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
