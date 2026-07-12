"use client";

import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const signInWithX = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "x",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      alert(`ログインエラー：${error.message}`);
    }
  };

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
      }}
    >
      <button
        type="button"
        onClick={signInWithX}
        style={{
          padding: "14px 24px",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        Xでログイン
      </button>
    </main>
  );
}