import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronRight, Globe, LogOut, PackageOpen, User } from "lucide-react";
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

  const userInitial = (meQuery.data?.username?.[0] ?? "U").toUpperCase();

  return (
    <div className="grid min-h-screen md:grid-cols-[86px_minmax(0,1fr)]">
      <aside className="flex border-b border-[var(--line-soft)] bg-[var(--bg-rail)] px-3 py-3 md:sticky md:top-0 md:h-screen md:flex-col md:justify-between md:border-b-0 md:border-r">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--line-strong)] bg-white text-lg font-bold text-[var(--brand-700)] shadow-sm">
          {userInitial}
        </div>

        <div className="relative ml-auto md:ml-0 md:flex md:justify-center" ref={menuRef}>
          {isMenuOpen ? (
            <div className="absolute bottom-12 right-0 z-40 min-w-[188px] rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-white p-1.5 shadow-[var(--shadow-md)] md:bottom-0 md:left-14 md:right-auto">
              <button
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-slate-100"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/?view=archived");
                }}
                type="button"
              >
                <PackageOpen className="h-4 w-4 text-[var(--text-muted)]" />
                <span>{t("app.archived")}</span>
              </button>

              <div className="relative" onMouseEnter={() => setIsLanguageMenuOpen(true)} onMouseLeave={() => setIsLanguageMenuOpen(false)}>
                <button
                  className="flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-slate-100"
                  onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
                  type="button"
                >
                  <span className="inline-flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                    {t("common.language")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
                {isLanguageMenuOpen ? (
                  <div className="absolute bottom-0 right-full z-40 mr-1 flex min-w-[164px] flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--line-soft)] bg-white p-1.5 shadow-[var(--shadow-md)] md:left-full md:right-auto md:ml-1 md:mr-0">
                    <button
                      className={`rounded-[10px] px-2 py-1.5 text-left text-sm ${
                        languagePreference === "system"
                          ? "bg-[var(--brand-600)] text-white"
                          : "text-[var(--text-secondary)] hover:bg-slate-100"
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
                      className={`rounded-[10px] px-2 py-1.5 text-left text-sm ${
                        languagePreference === "zh-CN"
                          ? "bg-[var(--brand-600)] text-white"
                          : "text-[var(--text-secondary)] hover:bg-slate-100"
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
                      className={`rounded-[10px] px-2 py-1.5 text-left text-sm ${
                        languagePreference === "en"
                          ? "bg-[var(--brand-600)] text-white"
                          : "text-[var(--text-secondary)] hover:bg-slate-100"
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
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                {logoutMutation.isPending ? t("app.signingOut") : t("app.signOut")}
              </button>
            </div>
          ) : null}

          <button
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-white text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--brand-300)] hover:text-[var(--text-primary)]"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            type="button"
          >
            <User className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      </aside>
      <main className="bg-[var(--bg-app)]">
        <Outlet />
      </main>
    </div>
  );
}
