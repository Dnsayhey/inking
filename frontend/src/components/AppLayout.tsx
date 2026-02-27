import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { getMe, logout } from "../api/auth";
import { clearTokens, getRefreshToken } from "../auth/token";

export function AppLayout() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!isMenuOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [isMenuOpen]);

  return (
    <div className="grid min-h-screen items-start md:grid-cols-[72px_minmax(0,1fr)]">
      <aside className="sticky top-0 flex h-screen flex-col justify-between border-r border-[#dbe1ea] bg-[#f6f7f4] px-2.5 py-3 max-md:static max-md:h-auto max-md:min-h-0 max-md:flex-row max-md:items-center max-md:border-b max-md:border-r-0 max-md:px-3 max-md:py-2">
        <div className="relative flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-900 text-base font-bold text-white">
            {(meQuery.data?.username?.[0] ?? "U").toUpperCase()}
          </div>
        </div>
        <div className="relative flex justify-center" ref={menuRef}>
          {isMenuOpen ? (
            <div className="absolute bottom-0 left-11 min-w-[120px] rounded-xl border border-[#dbe1ea] bg-white p-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.14)] max-md:bottom-[42px] max-md:left-0">
              <button
                className="w-full rounded-lg bg-white px-2 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
                type="button"
              >
                {logoutMutation.isPending ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : null}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            type="button"
          >
            <span className="relative inline-block h-[18px] w-[18px]">
              <span className="absolute left-[5px] top-[1px] h-2 w-2 rounded-full border-[1.7px] border-slate-500" />
              <span className="absolute bottom-[1px] left-[2px] h-2 w-[14px] rounded-b-[10px] border-[1.7px] border-t-0 border-slate-500" />
            </span>
          </button>
        </div>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
