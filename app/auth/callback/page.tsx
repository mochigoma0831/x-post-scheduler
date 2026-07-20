"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const finishLogin = async () => {
      const code = new URLSearchParams(
        window.location.search
      ).get("code");

      if (!code) {
        alert(
          "ログイン情報を受け取れませんでした"
        );
        router.replace("/signin");
        return;
      }

      const { data, error } =
        await supabase.auth.exchangeCodeForSession(
          code
        );

      if (error || !data.session) {
        alert(
          `ログイン処理エラー：${
            error?.message ??
            "セッションを取得できませんでした"
          }`
        );
        router.replace("/signin");
        return;
      }

      if (!data.session.provider_token) {
        alert(
          "Xのアクセストークンを取得できませんでした"
        );
        router.replace("/signin");
        return;
      }

      const response = await fetch(
        "/api/x/accounts",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({
            xUserId:
              data.session.user.user_metadata
                ?.provider_id ?? null,
            accessToken:
              data.session.provider_token,
            refreshToken:
              data.session
                .provider_refresh_token ??
              null,
            expiresAt: null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          `Xアカウント保存エラー：${
            result.message ??
            "保存できませんでした"
          }`
        );
        router.replace("/signin");
        return;
      }

      router.replace("/");
    };

    void finishLogin();
  }, [router]);

  return (
    <main style={{ padding: 40 }}>
      <p>ログイン処理中...</p>
    </main>
  );
}