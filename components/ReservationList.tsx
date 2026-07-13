"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type StoredImage = {
  order?: number;
  name?: string;
  path?: string;
  url?: string;
};

type StoredThread = {
  order?: number;
  text?: string;
  images?: StoredImage[];
};

type Reservation = {
  id: string;
  title: string | null;
  status: string | null;
  scheduled_at: string | null;
  threads: StoredThread[] | null;
};

export default function ReservationList() {
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, title, status, scheduled_at, threads"
      )
      .order("scheduled_at", {
        ascending: true,
      });

    if (error) {
      console.error(error);
      setErrorMessage(
        `予約一覧を取得できませんでした：${error.message}`
      );
      setReservations([]);
      setIsLoading(false);
      return;
    }
    const loadedReservations =
      (data ?? []) as Reservation[];

    const imagePaths = loadedReservations.flatMap(
      (reservation) =>
        (reservation.threads ?? []).flatMap(
          (thread) =>
            (thread.images ?? [])
              .map((image) => image.path)
              .filter(
                (path): path is string =>
                  Boolean(path)
              )
        )
    );

    const uniqueImagePaths = [
      ...new Set(imagePaths),
    ];

    const signedUrlMap = new Map<
      string,
      string
    >();

    if (uniqueImagePaths.length > 0) {
      const {
        data: signedUrlData,
        error: signedUrlError,
      } = await supabase.storage
        .from("post-images")
        .createSignedUrls(
          uniqueImagePaths,
          60 * 60
        );

      if (signedUrlError) {
        console.error(signedUrlError);
        setErrorMessage(
          `画像を読み込めませんでした：${signedUrlError.message}`
        );
      } else {
        signedUrlData?.forEach((item) => {
          if (item.path && item.signedUrl) {
            signedUrlMap.set(
              item.path,
              item.signedUrl
            );
          }
        });
      }
    }

    const reservationsWithSignedUrls =
      loadedReservations.map(
        (reservation) => ({
          ...reservation,
          threads: (
            reservation.threads ?? []
          ).map((thread) => ({
            ...thread,
            images: (
              thread.images ?? []
            ).map((image) => ({
              ...image,
              url: image.path
                ? signedUrlMap.get(
                    image.path
                  ) ??
                  image.url ??
                  ""
                : image.url ?? "",
            })),
          })),
        })
      );

    setReservations(
      reservationsWithSignedUrls
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadReservations();

    const handleReservationSaved = () => {
      void loadReservations();
    };

    window.addEventListener(
      "reservation-saved",
      handleReservationSaved
    );

    return () => {
      window.removeEventListener(
        "reservation-saved",
        handleReservationSaved
      );
    };
  }, [loadReservations]);

  const editReservation = (
    reservation: Reservation
  ) => {
    window.dispatchEvent(
      new CustomEvent<Reservation>(
        "edit-reservation",
        {
          detail: reservation,
        }
      )
    );
  };

  const deleteReservation = async (
    reservation: Reservation
  ) => {
    const confirmed = window.confirm(
      `「${
        reservation.title || "無題の投稿"
      }」を削除しますか？`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(reservation.id);
    setErrorMessage("");

    const imagePaths =
      reservation.threads?.flatMap(
        (thread) =>
          (thread.images ?? [])
            .map((image) => image.path)
            .filter(
              (path): path is string =>
                Boolean(path)
            )
      ) ?? [];

    if (imagePaths.length > 0) {
      const { error: storageError } =
        await supabase.storage
          .from("post-images")
          .remove(imagePaths);

      if (storageError) {
        console.error(storageError);
        setDeletingId(null);
        setErrorMessage(
          `画像を削除できませんでした：${storageError.message}`
        );
        return;
      }
    }

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", reservation.id);

    setDeletingId(null);

    if (error) {
      console.error(error);
      setErrorMessage(
        `予約を削除できませんでした：${error.message}`
      );
      return;
    }

    setReservations((current) =>
      current.filter(
        (item) =>
          item.id !== reservation.id
      )
    );
  };

  const formatScheduledAt = (
    value: string | null
  ) => {
    if (!value) {
      return "日時未設定";
    }

    const date = new Date(value);

    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  };

  if (isLoading) {
    return (
      <p className="rounded-xl bg-[#2b2b2b] p-4 text-gray-300">
        読み込み中...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <p className="rounded-xl bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </p>
      )}

      {reservations.length === 0 ? (
        <p className="rounded-xl bg-[#2b2b2b] p-4 text-gray-400">
          予約はまだありません。
        </p>
      ) : (
        reservations.map(
          (reservation) => {
            const images =
              reservation.threads?.flatMap(
                (thread) =>
                  thread.images ?? []
              ) ?? [];

            return (
              <article
                key={reservation.id}
                className="rounded-xl border border-gray-700 bg-[#2b2b2b] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">
                      {reservation.title ||
                        "無題の投稿"}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      {formatScheduledAt(
                        reservation.scheduled_at
                      )}
                    </p>

                    {images.length > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {images
                          .slice(0, 12)
                          .map(
                            (
                              image,
                              index
                            ) => (
                              <div
                                key={`${
                                  reservation.id
                                }-${
                                  image.path ??
                                  index
                                }`}
                                className="relative overflow-hidden rounded-lg border border-gray-700 bg-black"
                              >
                                {image.url ? (
                                  <img
                                    src={
                                      image.url
                                    }
                                    alt={
                                      image.name ||
                                      `画像${
                                        index +
                                        1
                                      }`
                                    }
                                    className="aspect-square h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex aspect-square items-center justify-center text-xs text-gray-500">
                                    画像
                                  </div>
                                )}

                                <span className="absolute bottom-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                                  {index + 1}
                                </span>
                              </div>
                            )
                          )}
                      </div>
                    )}

                    {images.length > 12 && (
                      <p className="mt-2 text-xs text-gray-500">
                        ほか{" "}
                        {images.length - 12}
                        枚
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <span className="rounded-full bg-blue-950 px-3 py-1 text-xs text-blue-200">
                      {reservation.status ===
                      "scheduled"
                        ? "予約済み"
                        : reservation.status ||
                          "未設定"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        editReservation(
                          reservation
                        )
                      }
                      disabled={
                        deletingId ===
                        reservation.id
                      }
                      className="rounded-lg bg-sky-950 px-3 py-2 text-sm text-sky-200 hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      編集
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteReservation(
                          reservation
                        )
                      }
                      disabled={
                        deletingId ===
                        reservation.id
                      }
                      className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-200 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId ===
                      reservation.id
                        ? "削除中..."
                        : "削除"}
                    </button>
                  </div>
                </div>
              </article>
            );
          }
        )
      )}
    </div>
  );
}