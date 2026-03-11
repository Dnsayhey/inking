const codeMessageMap: Record<number, string> = {
  1001: "用户名或密码错误",
  1002: "登录状态已失效，请重新登录",
  1003: "登录状态已过期，请重新登录",
  1005: "用户名已存在",
  1006: "请先登录",
  2001: "笔记不存在或已删除",
  2003: "标签不存在，请刷新后重试",
  2005: "提醒日期无效，请检查日期",
  3002: "标签名称已存在",
  3003: "来源标签和目标标签不能相同",
};

export function getMessageByCode(code?: number, fallback?: string): string {
  if (typeof code === "number" && code in codeMessageMap) {
    return codeMessageMap[code];
  }
  return fallback || "操作失败，请稍后重试";
}
