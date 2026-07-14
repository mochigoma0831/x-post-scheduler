"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const signInWithX = async () => {
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "x",
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: "tweet.read tweet.write users.read offline.access",
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>SNS投稿予約ツール</h1>

        <button
          type="button"
          onClick={signInWithX}
          disabled={loading}
        >
          {loading ? "Xに接続中..." : "Xでログイン"}
        </button>

        {errorMessage && <p>エラー：{errorMessage}</p>}
      </div>
    </main>
  );
}