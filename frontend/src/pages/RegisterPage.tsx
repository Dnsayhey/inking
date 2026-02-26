import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { login, register } from "../api/auth";
import { setTokens } from "../auth/token";

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
      navigate("/", { replace: true });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-kicker">INKING</p>
        <h1 className="auth-title">创建新账号</h1>
        <p className="auth-subtitle">注册后会自动登录并进入你的笔记工作台。</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label" htmlFor="username">
            用户名
          </label>
          <input id="username" className="field-input" {...registerField("username")} placeholder="例如：yanlei" />
          {errors.username ? <p className="field-error">{errors.username.message}</p> : null}

          <label className="field-label" htmlFor="password">
            密码
          </label>
          <input
            id="password"
            className="field-input"
            type="password"
            {...registerField("password")}
            placeholder="至少 8 个字符"
          />
          {errors.password ? <p className="field-error">{errors.password.message}</p> : null}

          <label className="field-label" htmlFor="confirmPassword">
            确认密码
          </label>
          <input
            id="confirmPassword"
            className="field-input"
            type="password"
            {...registerField("confirmPassword")}
            placeholder="再次输入密码"
          />
          {errors.confirmPassword ? <p className="field-error">{errors.confirmPassword.message}</p> : null}

          {registerMutation.isError ? <p className="form-error">注册失败，用户名可能已存在</p> : null}

          <button className="btn-primary" disabled={registerMutation.isPending} type="submit">
            {registerMutation.isPending ? "注册中..." : "注册并登录"}
          </button>
        </form>

        <p className="auth-footnote">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
}
