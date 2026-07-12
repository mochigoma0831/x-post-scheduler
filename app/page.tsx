"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <main style={{ padding: 40 }}>
        <p>ログイン確認中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 40 }}>
        <h1>ログインしていません</h1>
        <a href="/signin">Xでログインする</a>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>ログイン成功！</h1>

      <p>
        <strong>名前：</strong>
        {user.user_metadata?.name ?? "取得できませんでした"}
      </p>

      <p>
        <strong>Xユーザー名：</strong>
        @{user.user_metadata?.preferred_username ?? "取得できませんでした"}
      </p>

      <p>
        <strong>ID：</strong>
        {user.id}
      </p>
    </main>
  );
}