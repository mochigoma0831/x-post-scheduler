"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignInPage() {
  const signInWithX = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "x",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
  };

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
      }}
    >
      <button
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