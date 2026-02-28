import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronRight, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";

import { getMe, logout } from "../api/auth";
import { clearTokens, getRefreshToken } from "../auth/token";
import { applyLanguagePreference, getLanguagePreference, LanguagePreference } from "../i18n";

export function AppLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(getLanguagePreference());
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

  useEffect(() => {
    if (!isMenuOpen) {
      setIsLanguageMenuOpen(false);
    }
  }, [isMenuOpen]);

  return (
    <div className="grid min-h-screen items-start md:grid-cols-[72px_minmax(0,1fr)]">
      <aside className="sticky top-0 flex h-screen flex-col justify-between border-r border-surface-line bg-surface-rail px-2.5 py-3 max-md:static max-md:h-auto max-md:min-h-0 max-md:flex-row max-md:items-center max-md:border-b max-md:border-r-0 max-md:px-3 max-md:py-2">
        <div className="relative flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-900 text-base font-bold text-white">
            {(meQuery.data?.username?.[0] ?? "U").toUpperCase()}
          </div>
        </div>
        <div className="relative flex justify-center" ref={menuRef}>
          {isMenuOpen ? (
            <div className="absolute bottom-0 left-11 min-w-[120px] rounded-xl border border-surface-line bg-white p-1.5 shadow-elev-md max-md:bottom-[42px] max-md:left-0">
              <button
                className="w-full rounded-lg bg-white px-2 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/?view=archived");
                }}
                type="button"
              >
                {t("app.archived")}
              </button>
              <div
                className="relative"
                onMouseEnter={() => setIsLanguageMenuOpen(true)}
                onMouseLeave={() => setIsLanguageMenuOpen(false)}
              >
                <button
                  className="flex w-full items-center justify-between rounded-lg bg-white px-2 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                  onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                  type="button"
                >
                  <span>{t("common.language")}</span>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
                {isLanguageMenuOpen ? (
                  <div className="absolute bottom-0 left-full z-30 flex max-h-[220px] min-w-[168px] flex-col gap-1 overflow-y-auto rounded-lg border border-surface-line bg-white p-1 shadow-elev-sm">
                    <button
                      className={`rounded-md px-2 py-1.5 text-left text-sm ${
                        languagePreference === "system" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        setLanguagePreference("system");
                        void applyLanguagePreference("system");
                        setIsLanguageMenuOpen(false);
                      }}
                      type="button"
                    >
                      {t("common.followSystem")}
                    </button>
                    <button
                      className={`rounded-md px-2 py-1.5 text-left text-sm ${
                        languagePreference === "zh-CN" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        setLanguagePreference("zh-CN");
                        void applyLanguagePreference("zh-CN");
                        setIsLanguageMenuOpen(false);
                      }}
                      type="button"
                    >
                      {t("common.chinese")}
                    </button>
                    <button
                      className={`rounded-md px-2 py-1.5 text-left text-sm ${
                        languagePreference === "en" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        setLanguagePreference("en");
                        void applyLanguagePreference("en");
                        setIsLanguageMenuOpen(false);
                      }}
                      type="button"
                    >
                      {t("common.english")}
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                className="w-full rounded-lg bg-white px-2 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
                type="button"
              >
                {logoutMutation.isPending ? t("app.signingOut") : t("app.signOut")}
              </button>
            </div>
          ) : null}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            type="button"
          >
            <User className="h-[18px] w-[18px] text-slate-500" strokeWidth={2} />
          </button>
        </div>
      </aside>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
