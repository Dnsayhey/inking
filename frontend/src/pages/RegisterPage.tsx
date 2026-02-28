import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login, register } from "../api/auth";
import { setTokens } from "../auth/token";
import { FieldError, FormError, PrimaryButton, TextInput, useToast } from "../components/ui";

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
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white/90 p-6 shadow-elev-xl backdrop-blur">
        <p className="m-0 text-xs font-bold tracking-[0.09em] text-sky-700">{t("common.appName")}</p>
        <h1 className="mt-1.5 text-[1.75rem] font-bold">{t("auth.createAccount")}</h1>

        <form className="grid gap-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-semibold" htmlFor="username">
            {t("auth.username")}
          </label>
          <TextInput id="username" {...registerField("username")} placeholder={t("auth.usernameExamplePlaceholder")} />
          {errors.username ? <FieldError>{errors.username.message}</FieldError> : null}

          <label className="text-sm font-semibold" htmlFor="password">
            {t("auth.password")}
          </label>
          <TextInput id="password" type="password" {...registerField("password")} placeholder={t("auth.passwordMinPlaceholder")} />
          {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}

          <label className="text-sm font-semibold" htmlFor="confirmPassword">
            {t("auth.confirmPassword")}
          </label>
          <TextInput
            id="confirmPassword"
            type="password"
            {...registerField("confirmPassword")}
            placeholder={t("auth.confirmPasswordPlaceholder")}
          />
          {errors.confirmPassword ? <FieldError>{errors.confirmPassword.message}</FieldError> : null}

          {registerMutation.isError ? <FormError>{t("auth.registerFailed")}</FormError> : null}

          <PrimaryButton disabled={registerMutation.isPending} type="submit">
            {registerMutation.isPending ? t("auth.registering") : t("auth.registerAndLogin")}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-[0.92rem] text-slate-600">
          {t("auth.hasAccount")}<Link to="/login">{t("auth.goLogin")}</Link>
        </p>
      </div>
    </div>
  );
}
