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

      if (error) {
        alert(
          `ログイン処理エラー：${error.message}`
        );
        router.replace("/signin");
        return;
      }

      console.log(
        "provider_tokenあり:",
        Boolean(data.session?.provider_token)
      );

      console.log(
        "provider_refresh_tokenあり:",
        Boolean(
          data.session?.provider_refresh_token
        )
      );

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