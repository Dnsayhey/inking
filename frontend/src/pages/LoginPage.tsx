import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login } from "../api/auth";
import { setTokens } from "../auth/token";
import { FieldError, FormError, PrimaryButton, TextInput, useToast } from "../components/ui";

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
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white/90 p-6 shadow-elev-xl backdrop-blur">
        <p className="m-0 text-xs font-bold tracking-[0.09em] text-sky-700">{t("common.appName")}</p>
        <h1 className="mt-1.5 text-[1.75rem] font-bold">{t("auth.welcomeBack")}</h1>

        <form className="grid gap-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-semibold" htmlFor="username">
            {t("auth.username")}
          </label>
          <TextInput id="username" {...register("username")} placeholder={t("auth.usernamePlaceholder")} />
          {errors.username ? <FieldError>{errors.username.message}</FieldError> : null}

          <label className="text-sm font-semibold" htmlFor="password">
            {t("auth.password")}
          </label>
          <TextInput id="password" type="password" {...register("password")} placeholder={t("auth.passwordPlaceholder")} />
          {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}

          {loginMutation.isError ? <FormError>{t("auth.loginFailed")}</FormError> : null}

          <PrimaryButton disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? t("auth.loggingIn") : t("auth.login")}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-[0.92rem] text-slate-600">
          {t("auth.noAccount")}<Link to="/register">{t("auth.goRegister")}</Link>
        </p>
      </div>
    </div>
  );
}
