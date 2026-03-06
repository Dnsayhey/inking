import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login } from "../api/auth";
import { setTokens } from "../auth/token";
import { useToast } from "../components/ui";

type LoginFormData = {
  username: string;
  password: string;
};

const loginSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(64, "用户名最多 64 个字符")
    .regex(/^[A-Za-z0-9_]+$/, "用户名只能包含英文数字与下划线"),
  password: z.string().min(8, "密码至少 8 个字符").max(128, "密码最多 128 个字符"),
});

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
    onSuccess: (tokens) => {
      setTokens(tokens.access_token, tokens.refresh_token);
      showToast("登录成功", "success");
      navigate("/notes", { replace: true });
    },
    onError: () => showToast("用户名或密码错误", "error"),
  });

  const onSubmit = (values: LoginFormData) => {
    loginMutation.mutate({
      username: values.username.trim(),
      password: values.password,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-10">
      <div className="mx-auto flex h-[min(700px,calc(100vh-5rem))] max-w-[1280px] flex-col gap-6">
        <header className="flex h-11 items-center justify-between">
          <p className="text-[22px] font-bold text-[#0F172A]">Inking Note · 墨记</p>
          <p className="text-sm text-[#475569]">记录灵感，沉淀思考</p>
        </header>

        <div className="grid flex-1 items-center gap-20 md:grid-cols-[520px_360px] md:justify-center">
          <section className="hidden space-y-3 md:block">
            <h1 className="text-[40px] font-bold text-[#0F172A]">欢迎回到墨记</h1>
            <p className="text-base text-[#334155]">开始记录吧！</p>
          </section>

          <section className="self-center rounded-[16px] border border-[#E2E8F0] bg-white p-5">
            <div className="flex h-11 gap-2">
              <div className="flex h-full flex-1 items-center justify-center rounded-[10px] bg-[#0F172A] text-sm font-semibold text-white">
                登录
              </div>
              <Link
                className="flex h-full flex-1 items-center justify-center rounded-[10px] bg-[#E2E8F0] text-sm font-semibold text-[#334155] transition hover:bg-[#CBD5E1]"
                to="/register"
              >
                注册
              </Link>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <input
                  className={`h-12 w-full rounded-[10px] border bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none ${
                    errors.username ? "border-[#EF4444] text-[#B91C1C]" : "border-[#CBD5E1] focus:border-[#60A5FA]"
                  }`}
                  placeholder="用户名"
                  {...register("username")}
                />
                {errors.username ? <p className="mt-1 text-[11px] text-[#DC2626]">{errors.username.message}</p> : null}
              </div>

              <div>
                <input
                  className={`h-12 w-full rounded-[10px] border bg-[#F8FAFC] px-3 text-sm text-[#0F172A] outline-none ${
                    errors.password ? "border-[#EF4444] text-[#B91C1C]" : "border-[#CBD5E1] focus:border-[#60A5FA]"
                  }`}
                  placeholder="密码"
                  type="password"
                  {...register("password")}
                />
                {errors.password ? <p className="mt-1 text-[11px] text-[#DC2626]">{errors.password.message}</p> : null}
              </div>

              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-[#2563EB] text-[15px] font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-60"
                disabled={loginMutation.isPending}
                type="submit"
              >
                {loginMutation.isPending ? "登录中..." : "登录"}
              </button>
            </form>

            <p className="mt-3 text-[13px] text-[#475569]">
              还没有账号？
              <Link className="ml-1 text-[#1D4ED8] hover:underline" to="/register">
                去注册
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
