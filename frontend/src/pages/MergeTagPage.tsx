import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { listTags } from "../api/tags";
import { useToast } from "../components/ui";
import { TAG_COLORS, TagColorPicker } from "./tags-shared";

export function MergeTagPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [targetName, setTargetName] = useState("");
  const [fromTagId, setFromTagId] = useState<number | null>(() => {
    const raw = searchParams.get("fromTagId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  });
  const [color, setColor] = useState<string | null>(TAG_COLORS[0]);

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags(),
  });
  const tags = tagsQuery.data ?? [];

  const fromTag = useMemo(() => tags.find((item) => item.id === fromTagId) ?? null, [tags, fromTagId]);

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
        <div className="space-y-[14px]">
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-[#475569]">保持标签名</p>
            <input
              className="h-10 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] outline-none focus:border-[#60A5FA]"
              onChange={(event) => setTargetName(event.target.value)}
              placeholder="例如：学习"
              value={targetName}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-[#475569]">合并来源</p>
            <select
              className="h-10 w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-[10px] text-[13px] outline-none focus:border-[#60A5FA]"
              onChange={(event) => setFromTagId(Number(event.target.value))}
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
            <p className="text-[13px] font-semibold text-[#475569]">颜色</p>
            <TagColorPicker onChange={setColor} value={color} />
          </div>

          <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
            合并功能后端接口尚未就绪，先于前端保留交互占位。
            {fromTag ? ` 当前来源：#${fromTag.name}` : ""}
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
            disabled={!targetName.trim() || !fromTagId}
            onClick={() =>
              showToast("后端 merge_tag 接口完成后即可接入此操作", "info")
            }
            type="button"
          >
            确认合并
          </button>
        </div>
      </section>
    </div>
  );
}
