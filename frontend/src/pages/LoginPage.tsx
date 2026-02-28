import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login } from "../api/auth";
import { setTokens } from "../auth/token";
import { FieldError, FormError, PrimaryButton, TextInput, useToast } from "../components/ui";

const loginSchema = z.object({
  username: z.string().min(3, "用户名至少 3 个字符").max(64, "用户名最多 64 个字符"),
  password: z.string().min(8, "密码至少 8 个字符").max(128, "密码最多 128 个字符"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
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
      showToast("登录成功", "success");
      navigate("/", { replace: true });
    },
    onError: () => {
      showToast("登录失败，请检查用户名和密码", "error");
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white/90 p-6 shadow-elev-xl backdrop-blur">
        <p className="m-0 text-xs font-bold tracking-[0.09em] text-sky-700">INKING · 墨记</p>
        <h1 className="mt-1.5 text-[1.75rem] font-bold">欢迎回来</h1>

        <form className="grid gap-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-semibold" htmlFor="username">
            用户名
          </label>
          <TextInput
            id="username"
            {...register("username")}
            placeholder="请输入用户名"
          />
          {errors.username ? <FieldError>{errors.username.message}</FieldError> : null}

          <label className="text-sm font-semibold" htmlFor="password">
            密码
          </label>
          <TextInput
            id="password"
            type="password"
            {...register("password")}
            placeholder="请输入密码"
          />
          {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}

          {loginMutation.isError ? <FormError>登录失败，请检查用户名和密码</FormError> : null}

          <PrimaryButton disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? "登录中..." : "登录"}
          </PrimaryButton>
        </form>

        <p className="mt-4 text-[0.92rem] text-slate-600">
          还没有账号？<Link to="/register">去注册</Link>
        </p>
      </div>
    </div>
  );
}
