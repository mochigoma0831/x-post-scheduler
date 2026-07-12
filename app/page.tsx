import PostEditor from "@/components/PostEditor";
import ReservationList from "@/components/ReservationList";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1f1f1f] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">
          投稿予約
        </h1>

        <PostEditor />

        <h2 className="mb-4 mt-10 text-2xl font-bold">
          予約済み
        </h2>

        <ReservationList />
      </div>
    </main>
  );
}
