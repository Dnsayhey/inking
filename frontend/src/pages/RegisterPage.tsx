import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login, register } from "../api/auth";
import { setTokens } from "../auth/token";
import { FieldError, FormError, PrimaryButton, TextInput, useToast } from "../components/ui";

const registerSchema = z
  .object({
    username: z.string().min(3, "用户名至少 3 个字符").max(64, "用户名最多 64 个字符"),
    password: z.string().min(8, "密码至少 8 个字符").max(128, "密码最多 128 个字符"),
    confirmPassword: z.string().min(8, "请确认密码"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterFormData) => {
      await register({ username: payload.username, password: payload.password });
      return login({ username: payload.username, password: payload.password });
    },
    onSuccess: (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      showToast("注册并登录成功", "success");
      navigate("/", { replace: true });
    },
    onError: () => {
      showToast("注册失败，用户名可能已存在", "error");
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white/90 p-6 shadow-elev-xl backdrop-blur">
        <p className="m-0 text-xs font-bold tracking-[0.09em] text-sky-700">INKING · 墨记</p>
        <h1 className="mt-1.5 text-[1.75rem] font-bold">创建新账号</h1>

        <form className="grid gap-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-semibold" htmlFor="username">
            用户名
          </label>
          <TextInput
            id="username"
            {...registerField("username")}
            placeholder="例如：yanlei"
          />
          {errors.username ? <FieldError>{errors.username.message}</FieldError> : null}

          <label className="text-sm font-semibold" htmlFor="password">
            密码
          </label>
          <TextInput
            id="password"
            type="password"
            {...registerField("password")}
            placeholder="至少 8 个字符"
          />
          {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}

          <label className="text-sm font-semibold" htmlFor="confirmPassword">
            确认密码
          </label>
          <TextInput
            id="confirmPassword"
            type="password"
            {...registerField("confirmPassword")}
            placeholder="再次输入密码"
          />
          {errors.confirmPassword ? <FieldError>{errors.confirmPassword.message}</FieldError> : null}

          {registerMutation.isError ? <FormError>注册失败，用户名可能已存在</FormError> : null}

          <PrimaryButton disabled={registerMutation.isPending} type="submit">
            {registerMutation.isPending ? "注册中..." : "注册并登录"}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-[0.92rem] text-slate-600">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
}
