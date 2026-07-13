"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import PostEditor from "@/components/PostEditor";
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

    void checkSession();

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

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

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
    <main className="min-h-screen bg-[#171717] p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              SNS投稿予約ツール
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              @{user.user_metadata?.preferred_username ?? "Xユーザー"}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
          >
            ログアウト
          </button>
        </div>

        <PostEditor />
      </div>
    </main>
  );
}