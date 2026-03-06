import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login } from "../api/auth";
import { setTokens } from "../auth/token";
import { Card, FieldError, FormError, PrimaryButton, TextInput, useToast } from "../components/ui";

type LoginFormData = {
  username: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const loginSchema = useMemo(
    () =>
      z.object({
        username: z
          .string()
          .min(3, t("auth.validation.usernameMin"))
          .max(64, t("auth.validation.usernameMax")),
        password: z
          .string()
          .min(8, t("auth.validation.passwordMin"))
          .max(128, t("auth.validation.passwordMax")),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      showToast(t("auth.loginSuccess"), "success");
      navigate("/", { replace: true });
    },
    onError: () => {
      showToast(t("auth.loginFailed"), "error");
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate({
      username: data.username.trim(),
      password: data.password,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[960px] overflow-hidden p-0" tone="elevated">
        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden bg-[radial-gradient(circle_at_20%_20%,#d7f0ff_0%,#ecf8ff_50%,#f7fbff_100%)] p-10 md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-[var(--brand-700)]">{t("common.appName")}</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--text-primary)]">{t("auth.welcomeBack")}</h1>
              <p className="mt-3 max-w-sm text-sm text-[var(--text-secondary)]">
                {t("auth.heroLoginDesc")}
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t("auth.heroFootnote")}</p>
          </section>

          <section className="bg-[var(--bg-panel)] p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--brand-700)] md:hidden">{t("common.appName")}</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{t("auth.login")}</h2>

            <form className="mt-5 grid gap-2" onSubmit={handleSubmit(onSubmit)}>
              <label className="text-sm font-medium text-[var(--text-secondary)]" htmlFor="username">
                {t("auth.username")}
              </label>
              <TextInput
                id="username"
                invalid={Boolean(errors.username)}
                {...register("username")}
                placeholder={t("auth.usernamePlaceholder")}
              />
              {errors.username ? <FieldError>{errors.username.message}</FieldError> : null}

              <label className="mt-2 text-sm font-medium text-[var(--text-secondary)]" htmlFor="password">
                {t("auth.password")}
              </label>
              <TextInput
                id="password"
                invalid={Boolean(errors.password)}
                type="password"
                {...register("password")}
                placeholder={t("auth.passwordPlaceholder")}
              />
              {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}

              {loginMutation.isError ? <FormError>{t("auth.loginFailed")}</FormError> : null}

              <PrimaryButton className="mt-3" disabled={loginMutation.isPending} type="submit">
                {loginMutation.isPending ? t("auth.loggingIn") : t("auth.login")}
              </PrimaryButton>
            </form>

            <p className="mt-5 text-sm text-[var(--text-secondary)]">
              {t("auth.noAccount")} <Link to="/register">{t("auth.goRegister")}</Link>
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
