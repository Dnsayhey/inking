import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login } from "../api/auth";
import { setTokens } from "../auth/token";

const loginSchema = z.object({
  username: z.string().min(3, "用户名至少 3 个字符").max(64, "用户名最多 64 个字符"),
  password: z.string().min(8, "密码至少 8 个字符").max(128, "密码最多 128 个字符"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
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
      navigate("/", { replace: true });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-kicker">INKING</p>
        <h1 className="auth-title">欢迎回来</h1>
        <p className="auth-subtitle">登录后可管理笔记清单，并在会话过期时自动刷新凭证。</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label" htmlFor="username">
            用户名
          </label>
          <input id="username" className="field-input" {...register("username")} placeholder="请输入用户名" />
          {errors.username ? <p className="field-error">{errors.username.message}</p> : null}

          <label className="field-label" htmlFor="password">
            密码
          </label>
          <input
            id="password"
            className="field-input"
            type="password"
            {...register("password")}
            placeholder="请输入密码"
          />
          {errors.password ? <p className="field-error">{errors.password.message}</p> : null}

          {loginMutation.isError ? <p className="form-error">登录失败，请检查用户名和密码</p> : null}

          <button className="btn-primary" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="auth-footnote">
          还没有账号？<Link to="/register">去注册</Link>
        </p>
      </div>
    </div>
  );
}
