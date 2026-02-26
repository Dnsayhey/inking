import { useMutation, useQuery } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router-dom";

import { getMe, logout } from "../api/auth";
import { clearTokens, getRefreshToken } from "../auth/token";

export function AppLayout() {
  const navigate = useNavigate();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        return;
      }
      await logout(refreshToken);
    },
    onSettled: () => {
      clearTokens();
      navigate("/login", { replace: true });
    },
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div>
            <p className="app-brand">Inking</p>
            <p className="app-caption">你的个人笔记空间，专注记录与整理。</p>
          </div>
          <div className="app-user-group">
            <span className="app-user-chip">{meQuery.data?.username ?? "..."}</span>
            <button
              className="btn-ghost"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              type="button"
            >
              {logoutMutation.isPending ? "退出中..." : "退出登录"}
            </button>
          </div>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
