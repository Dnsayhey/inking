import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login, register } from "../api/auth";
import { setTokens } from "../auth/token";
import { Card, FieldError, FormError, PrimaryButton, TextInput, useToast } from "../components/ui";

type RegisterFormData = {
  username: string;
  password: string;
  confirmPassword: string;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const registerSchema = useMemo(
    () =>
      z
        .object({
          username: z
            .string()
            .min(3, t("auth.validation.usernameMin"))
            .max(64, t("auth.validation.usernameMax")),
          password: z
            .string()
            .min(8, t("auth.validation.passwordMin"))
            .max(128, t("auth.validation.passwordMax")),
          confirmPassword: z.string().min(8, t("auth.validation.confirmPasswordRequired")),
        })
        .refine((values) => values.password === values.confirmPassword, {
          path: ["confirmPassword"],
          message: t("auth.validation.passwordMismatch"),
        }),
    [t],
  );
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterFormData) => {
      const username = payload.username.trim();
      await register({ username, password: payload.password });
      return login({ username, password: payload.password });
    },
    onSuccess: (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      showToast(t("auth.registerSuccess"), "success");
      navigate("/", { replace: true });
    },
    onError: () => {
      showToast(t("auth.registerFailed"), "error");
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[980px] overflow-hidden p-0" tone="elevated">
        <div className="grid md:grid-cols-[0.95fr_1.05fr]">
          <section className="hidden bg-[radial-gradient(circle_at_80%_20%,#d7f0ff_0%,#ecf8ff_48%,#f7fbff_100%)] p-10 md:flex md:flex-col md:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-[var(--brand-700)]">{t("common.appName")}</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--text-primary)]">{t("auth.createAccount")}</h1>
              <p className="mt-3 max-w-sm text-sm text-[var(--text-secondary)]">
                {t("auth.heroRegisterDesc")}
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t("auth.heroRegisterFootnote")}</p>
          </section>

          <section className="bg-[var(--bg-panel)] p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--brand-700)] md:hidden">{t("common.appName")}</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{t("auth.registerAndLogin")}</h2>

            <form className="mt-5 grid gap-2" onSubmit={handleSubmit(onSubmit)}>
              <label className="text-sm font-medium text-[var(--text-secondary)]" htmlFor="username">
                {t("auth.username")}
              </label>
              <TextInput
                id="username"
                invalid={Boolean(errors.username)}
                {...registerField("username")}
                placeholder={t("auth.usernameExamplePlaceholder")}
              />
              {errors.username ? <FieldError>{errors.username.message}</FieldError> : null}

              <label className="mt-2 text-sm font-medium text-[var(--text-secondary)]" htmlFor="password">
                {t("auth.password")}
              </label>
              <TextInput
                id="password"
                invalid={Boolean(errors.password)}
                type="password"
                {...registerField("password")}
                placeholder={t("auth.passwordMinPlaceholder")}
              />
              {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}

              <label className="mt-2 text-sm font-medium text-[var(--text-secondary)]" htmlFor="confirmPassword">
                {t("auth.confirmPassword")}
              </label>
              <TextInput
                id="confirmPassword"
                invalid={Boolean(errors.confirmPassword)}
                type="password"
                {...registerField("confirmPassword")}
                placeholder={t("auth.confirmPasswordPlaceholder")}
              />
              {errors.confirmPassword ? <FieldError>{errors.confirmPassword.message}</FieldError> : null}

              {registerMutation.isError ? <FormError>{t("auth.registerFailed")}</FormError> : null}

              <PrimaryButton className="mt-3" disabled={registerMutation.isPending} type="submit">
                {registerMutation.isPending ? t("auth.registering") : t("auth.registerAndLogin")}
              </PrimaryButton>
            </form>

            <p className="mt-5 text-sm text-[var(--text-secondary)]">
              {t("auth.hasAccount")} <Link to="/login">{t("auth.goLogin")}</Link>
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
