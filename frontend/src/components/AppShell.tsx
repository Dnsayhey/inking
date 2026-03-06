import { useMutation, useQuery } from "@tanstack/react-query";
import { AlarmClock, NotebookPen, PanelLeftClose, PanelLeftOpen, Tags } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { getMe, logout } from "../api/auth";
import { clearTokens, getRefreshToken } from "../auth/token";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "inking.sidebar.collapsed";

const navItems = [
  { to: "/notes", label: "笔记", icon: NotebookPen },
  { to: "/tags", label: "标签", icon: Tags },
  { to: "/reminders", label: "提醒", icon: AlarmClock },
];

function readCollapsedState() {
  const stored = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  if (stored === "1") return true;
  if (stored === "0") return false;
  return window.location.pathname.startsWith("/tags") || window.location.pathname.startsWith("/reminders");
}

export function AppShell() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => readCollapsedState());

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await logout(refreshToken);
      }
    },
    onSettled: () => {
      clearTokens();
      navigate("/login", { replace: true });
    },
  });

  const avatarText = useMemo(() => {
    const username = meQuery.data?.username?.trim();
    if (!username) return "U";
    return username[0].toUpperCase();
  }, [meQuery.data?.username]);

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC] p-2">
      <div className="flex h-full w-full gap-4">
        <aside
          className={`flex h-full flex-col justify-between bg-[#0F172A] text-white transition-all ${
            collapsed ? "w-[72px] rounded-[12px] px-2 py-2.5" : "w-[220px] rounded-[14px] p-[14px]"
          }`}
        >
          <div className={`${collapsed ? "space-y-2.5" : "space-y-3"}`}>
            <div className={`flex h-[34px] ${collapsed ? "justify-center" : "justify-end"}`}>
              <button
                className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[8px] bg-[#111827] text-[#CBD5E1] transition hover:bg-[#1E293B] hover:text-white"
                onClick={() => setCollapsed((prev) => !prev)}
                type="button"
              >
                {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
              </button>
            </div>

            {!collapsed ? (
              <div className="space-y-2 pb-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1D4ED8] text-2xl font-bold">
                  {avatarText}
                </div>
                <p className="text-center text-base font-bold text-white">{meQuery.data?.username ?? "yanlei"}</p>
              </div>
            ) : null}

            <nav className={collapsed ? "space-y-2.5" : "space-y-2"}>
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  className={({ isActive }) =>
                    collapsed
                      ? `mx-auto flex h-[34px] w-[34px] items-center justify-center rounded-[8px] transition ${
                          isActive ? "bg-[#1E293B] text-white" : "bg-[#111827] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                        }`
                      : `group flex h-9 items-center justify-between rounded-[8px] px-2.5 text-[13px] transition ${
                          isActive ? "bg-[#1E293B] text-white" : "bg-[#111827] text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white"
                        }`
                  }
                  to={to}
                >
                  {collapsed ? <Icon className="h-3.5 w-3.5" /> : <span>{label}</span>}
                  {!collapsed ? <Icon className="h-4 w-4" /> : null}
                </NavLink>
              ))}
            </nav>
          </div>

          {!collapsed ? (
            <button
              className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#7F1D1D] px-3 text-[13px] font-semibold text-[#FEE2E2] transition hover:bg-[#991B1B] disabled:opacity-60"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              type="button"
            >
              退出登录
            </button>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
