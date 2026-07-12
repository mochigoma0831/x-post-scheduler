"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    getUser();
  }, []);

  if (!user) {
    return (
      <main style={{ padding: 40 }}>
        <h1>ログインしていません</h1>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>ログイン成功！🎉</h1>

      <p>
        <strong>名前：</strong>
        {user.user_metadata?.name}
      </p>

      <p>
        <strong>Xユーザー名：</strong>
        @{user.user_metadata?.preferred_username}
      </p>

      <p>
        <strong>ID：</strong>
        {user.id}
      </p>
    </main>
  );
}