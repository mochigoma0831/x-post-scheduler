"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

type PostImage = {
  id: number;
  file?: File;
  previewUrl: string;
  name: string;
  storagePath?: string;
  publicUrl?: string;
  isExisting: boolean;
};

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

type EditableReservation = {
  id: string;
  title: string | null;
  status: string | null;
  scheduled_at: string | null;
  threads: StoredThread[] | null;
};

type PostItem = {
  id: number;
  text: string;
  images: PostImage[];
};

type DraggingImage = {
  postId: number;
  imageId: number;
} | null;

export default function PostEditor() {
  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: 1,
      text: "0/1",
      images: [],
    },
    {
      id: 2,
      text: "1/1",
      images: [],
    },
  ]);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [draggingPostId, setDraggingPostId] =
    useState<number | null>(null);
  const [draggingImage, setDraggingImage] =
    useState<DraggingImage>(null);
  const [numberingEnabled, setNumberingEnabled] =
    useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const postsRef = useRef(posts);
  const originalStoragePaths = useRef<string[]>([]);
  const nextPostId = useRef(3);
  const nextImageId = useRef(1);

  const createPostImage = (file: File): PostImage => {
    const image: PostImage = {
      id: nextImageId.current,
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      isExisting: false,
    };

    nextImageId.current += 1;
    return image;
  };

  const stripNumbering = (text: string) => {
    return text
      .replace(/\s*\n?\d+\/\d+\s*$/u, "")
      .trimEnd();
  };

  const applyNumbering = (
    currentPosts: PostItem[],
    enabled: boolean
  ) => {
    const contentPostCount = Math.max(
      currentPosts.length - 1,
      0
    );

    return currentPosts.map((post, index) => {
      const cleanText = stripNumbering(post.text);

      if (!enabled) {
        return {
          ...post,
          text: cleanText,
        };
      }

      const numberText =
        index === 0
          ? `0/${contentPostCount}`
          : `${index}/${contentPostCount}`;

      return {
        ...post,
        text: cleanText
          ? `${cleanText}\n${numberText}`
          : numberText,
      };
    });
  };

  const addPost = () => {
    setPosts((currentPosts) => {
      const nextPosts = [
        ...currentPosts,
        {
          id: nextPostId.current,
          text: "",
          images: [],
        },
      ];

      nextPostId.current += 1;

      return numberingEnabled
        ? applyNumbering(nextPosts, true)
        : nextPosts;
    });
  };

  const updatePost = (id: number, text: string) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === id ? { ...post, text } : post
      )
    );
  };

  const removePost = (id: number) => {
    setPosts((currentPosts) => {
      if (currentPosts.length <= 2) {
        return currentPosts;
      }

      const targetPost = currentPosts.find(
        (post) => post.id === id
      );

      targetPost?.images.forEach((image) => {
        if (!image.isExisting) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });

      const nextPosts = currentPosts.filter(
        (post) => post.id !== id
      );

      return numberingEnabled
        ? applyNumbering(nextPosts, true)
        : nextPosts;
    });
  };

  const distributeFilesFromPost = (
    postId: number,
    files: File[]
  ) => {
    const imageFiles = files
      .filter((file) =>
        file.type.startsWith("image/")
      )
      .slice(0, 20);

    if (imageFiles.length === 0) {
      setMessage("画像ファイルを選んでください。");
      return;
    }

    setPosts((currentPosts) => {
      const targetIndex = currentPosts.findIndex(
        (post) => post.id === postId
      );

      if (targetIndex === -1) {
        return currentPosts;
      }

      const targetPost = currentPosts[targetIndex];
      const targetLimit = targetIndex === 0 ? 1 : 4;
      const availableInTarget =
        targetLimit - targetPost.images.length;

      const filesForTarget = imageFiles.slice(
        0,
        Math.max(availableInTarget, 0)
      );

      const remainingFiles = imageFiles.slice(
        filesForTarget.length
      );

      const updatedTarget: PostItem = {
        ...targetPost,
        images: [
          ...targetPost.images,
          ...filesForTarget.map(createPostImage),
        ],
      };

      const generatedPosts: PostItem[] = [];

      for (
        let index = 0;
        index < remainingFiles.length;
        index += 4
      ) {
        generatedPosts.push({
          id: nextPostId.current,
          text: "",
          images: remainingFiles
            .slice(index, index + 4)
            .map(createPostImage),
        });

        nextPostId.current += 1;
      }

      const nextPosts = [
        ...currentPosts.slice(0, targetIndex),
        updatedTarget,
        ...generatedPosts,
        ...currentPosts.slice(targetIndex + 1),
      ];

      return numberingEnabled
        ? applyNumbering(nextPosts, true)
        : nextPosts;
    });

    setMessage(
      `${imageFiles.length}枚をX用に自動分割しました。`
    );
  };

  const handleFileSelect = (
    postId: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files ?? []
    );

    distributeFilesFromPost(postId, files);
    event.target.value = "";
  };

  const handleDragOver = (
    postId: number,
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDraggingPostId(postId);
  };

  const handleDragLeave = (
    postId: number,
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    if (draggingPostId === postId) {
      setDraggingPostId(null);
    }
  };

  const handleDrop = (
    postId: number,
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const files = Array.from(
      event.dataTransfer.files
    );

    distributeFilesFromPost(postId, files);
    setDraggingPostId(null);
  };

  const removeImage = (
    postId: number,
    imageId: number
  ) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const targetImage = post.images.find(
          (image) => image.id === imageId
        );

        if (targetImage && !targetImage.isExisting) {
          URL.revokeObjectURL(
            targetImage.previewUrl
          );
        }

        return {
          ...post,
          images: post.images.filter(
            (image) => image.id !== imageId
          ),
        };
      })
    );
  };

  const handleImageDragStart = (
    postId: number,
    imageId: number,
    event: DragEvent<HTMLDivElement>
  ) => {
    setDraggingImage({ postId, imageId });
    event.dataTransfer.effectAllowed = "move";
  };

  const handleImageDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleImageDrop = (
    postId: number,
    targetImageId: number,
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    if (
      !draggingImage ||
      draggingImage.postId !== postId ||
      draggingImage.imageId === targetImageId
    ) {
      setDraggingImage(null);
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const fromIndex = post.images.findIndex(
          (image) =>
            image.id === draggingImage.imageId
        );
        const toIndex = post.images.findIndex(
          (image) =>
            image.id === targetImageId
        );

        if (fromIndex === -1 || toIndex === -1) {
          return post;
        }

        const reorderedImages = [
          ...post.images,
        ];
        const [movedImage] =
          reorderedImages.splice(
            fromIndex,
            1
          );

        reorderedImages.splice(
          toIndex,
          0,
          movedImage
        );

        return {
          ...post,
          images: reorderedImages,
        };
      })
    );

    setDraggingImage(null);
  };

  const toggleNumbering = () => {
    setNumberingEnabled((current) => {
      const next = !current;

      setPosts((currentPosts) =>
        applyNumbering(currentPosts, next)
      );

      return next;
    });
  };

  useEffect(() => {
    const handleEditReservation = async (
      event: Event
    ) => {
      const reservation = (
        event as CustomEvent<EditableReservation>
      ).detail;


      const storagePaths =
        (reservation.threads ?? []).flatMap(
          (thread) =>
            (thread.images ?? [])
              .map((image) => image.path)
              .filter(
                (path): path is string =>
                  Boolean(path)
              )
        );

      const signedUrlMap = new Map<
        string,
        string
      >();

      if (storagePaths.length > 0) {
        const { data, error } =
          await supabase.storage
            .from("post-images")
            .createSignedUrls(
              storagePaths,
              60 * 60
            );

        if (error) {
          console.error(error);
          setMessage(
            `画像を読み込めませんでした：${error.message}`
          );
          return;
        }

        data?.forEach((item) => {
          if (item.path && item.signedUrl) {
            signedUrlMap.set(
              item.path,
              item.signedUrl
            );
          }
        });
      }

      const loadedPosts: PostItem[] =
        (reservation.threads ?? []).map(
          (thread, postIndex) => ({
            id: postIndex + 1,
            text: thread.text ?? "",
            images: (thread.images ?? []).map(
              (image, imageIndex) => {
                const previewUrl = image.path
                  ? signedUrlMap.get(image.path) ??
                    ""
                  : image.url ?? "";

                return {
                  id:
                    (postIndex + 1) * 1000 +
                    imageIndex + 1,
                  previewUrl,
                  name:
                    image.name ??
                    `画像${imageIndex + 1}`,
                  storagePath: image.path,
                  publicUrl: previewUrl,
                  isExisting: true,
                };
              }
            ),
          })
        );

      const safePosts =
        loadedPosts.length > 0
          ? loadedPosts
          : [
              {
                id: 1,
                text: "0/1",
                images: [],
              },
              {
                id: 2,
                text: "1/1",
                images: [],
              },
            ];

      setPosts(safePosts);
      nextPostId.current =
        Math.max(
          ...safePosts.map((post) => post.id)
        ) + 1;
      nextImageId.current = 100000;

      const scheduledDate = reservation.scheduled_at
        ? new Date(reservation.scheduled_at)
        : null;

      if (
        scheduledDate &&
        !Number.isNaN(scheduledDate.getTime())
      ) {
        const localDate = new Date(
          scheduledDate.getTime() -
            scheduledDate.getTimezoneOffset() *
              60000
        );

        setDate(
          localDate.toISOString().slice(0, 10)
        );
        setTime(
          localDate.toISOString().slice(11, 16)
        );
      }

      originalStoragePaths.current =
        storagePaths;

      setEditingId(reservation.id);
      setMessage(
        "予約を編集中です。変更後に保存してください。"
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

    window.addEventListener(
      "edit-reservation",
      handleEditReservation
    );

    return () => {
      window.removeEventListener(
        "edit-reservation",
        handleEditReservation
      );
    };
  }, []);

  const resetForm = () => {
    posts.forEach((post) => {
      post.images.forEach((image) => {
        if (!image.isExisting) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
    });

    setPosts([
      {
        id: 1,
        text: "0/1",
        images: [],
      },
      {
        id: 2,
        text: "1/1",
        images: [],
      },
    ]);

    nextPostId.current = 3;
    nextImageId.current = 1;
    setDate("");
    setTime("");
    setNumberingEnabled(true);
    setEditingId(null);
    originalStoragePaths.current = [];
  };

  const saveReservation = async () => {
    setMessage("");

    const hasText = posts.some(
      (post) => post.text.trim().length > 0
    );

    const hasImages = posts.some(
      (post) => post.images.length > 0
    );

    if (!hasText && !hasImages) {
      setMessage(
        "本文または画像を追加してください。"
      );
      return;
    }

    if (!date || !time) {
      setMessage(
        "予約する日付と時刻を選んでください。"
      );
      return;
    }

    const scheduledDate = new Date(
      `${date}T${time}:00`
    );

    if (Number.isNaN(scheduledDate.getTime())) {
      setMessage("予約日時が正しくありません。");
      return;
    }

    if (scheduledDate.getTime() <= Date.now()) {
      setMessage(
        "現在より後の日時を指定してください。"
      );
      return;
    }

    setIsSaving(true);
    setMessage("画像をアップロードしています...");

    const reservationId = editingId ?? crypto.randomUUID();
    const uploadedPaths: string[] = [];

    try {
      const uploadedThreads = [];

      for (
        let postIndex = 0;
        postIndex < posts.length;
        postIndex += 1
      ) {
        const post = posts[postIndex];
        const uploadedImages = [];

        for (
          let imageIndex = 0;
          imageIndex < post.images.length;
          imageIndex += 1
        ) {
          const image = post.images[imageIndex];
          /*
  編集前から存在する画像は再アップロードしない。
  現在保存されているURLとパスをそのまま使用する。
*/
if (image.isExisting && !image.file) {
  uploadedImages.push({
    order: imageIndex + 1,
    name: image.name,
    path: image.storagePath ?? "",
    url: image.publicUrl ?? image.previewUrl,
  });

  continue;
}

if (!image.file) {
  throw new Error(`${image.name} の画像データがありません`);
}

          const extension =
            image.name.split(".").pop()?.toLowerCase() || "jpg";
          const storagePath =
            `${reservationId}/post-${postIndex + 1}/` +
            `${imageIndex + 1}-${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("post-images")
            .upload(storagePath, image.file, {
              contentType: image.file.type || "image/jpeg",
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw uploadError;
          }

          uploadedPaths.push(storagePath);

          const { data: publicUrlData } = supabase.storage
            .from("post-images")
            .getPublicUrl(storagePath);

          uploadedImages.push({
            order: imageIndex + 1,
            name: image.name,
            path: storagePath,
            url: publicUrlData.publicUrl,
          });
        }

        uploadedThreads.push({
          order: postIndex + 1,
          text: post.text,
          images: uploadedImages,
        });
      }

      setMessage("予約データを保存しています...");

      const firstText =
        posts.find(
          (post) => stripNumbering(post.text).trim().length > 0
        )?.text.trim() ?? "画像投稿";

      const reservationData = {
        title: stripNumbering(firstText).slice(
          0,
          50
        ),
        status: "scheduled",
        scheduled_at:
          scheduledDate.toISOString(),
        threads: uploadedThreads,
      };

      if (editingId) {
        const { error: updateError } =
          await supabase
            .from("posts")
            .update(reservationData)
            .eq("id", editingId);

        if (updateError) {
          throw updateError;
        }

        const keptPaths =
          uploadedThreads.flatMap((thread) =>
            thread.images
              .map((image) => image.path)
              .filter(
                (path): path is string =>
                  Boolean(path)
              )
          );

        const removedPaths =
          originalStoragePaths.current.filter(
            (path) => !keptPaths.includes(path)
          );

        if (removedPaths.length > 0) {
          const { error: removeError } =
            await supabase.storage
              .from("post-images")
              .remove(removedPaths);

          if (removeError) {
            console.error(removeError);
          }
        }

        setMessage("予約を更新しました。");
      } else {
        const { error: insertError } =
          await supabase
            .from("posts")
            .insert(reservationData);

        if (insertError) {
          throw insertError;
        }

        setMessage(
          "画像と予約を保存しました。"
        );
      }

      window.dispatchEvent(
        new Event("reservation-saved")
      );
      resetForm();
    } catch (error) {
      console.error(error);

      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from("post-images")
          .remove(uploadedPaths);
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました。";

      setMessage(
        `保存できませんでした：${errorMessage}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-700 bg-[#2b2b2b] p-6">
      <div className="mb-6 rounded-xl border border-sky-900 bg-sky-950/20 p-4 text-sm text-gray-300">
        <p className="font-bold text-sky-200">
          X用の分割ルール
        </p>
        <p className="mt-1">
          1件目は画像1枚まで、2件目以降は画像4枚ごとに自動でツリー化します。
        </p>
      </div>

      <div className="space-y-8">
        {posts.map((post, index) => {
          const imageLimit = index === 0 ? 1 : 4;

          return (
            <div
              key={post.id}
              className="rounded-xl border border-gray-700 bg-[#242424] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold text-gray-300">
                  {index + 1}件目
                  {index === 0 && (
                    <span className="ml-2 text-xs font-normal text-sky-300">
                      先頭画像
                    </span>
                  )}
                </span>

                {posts.length > 2 && index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      removePost(post.id)
                    }
                    className="rounded-md px-3 py-1 text-sm text-gray-300 hover:bg-red-950 hover:text-red-300"
                  >
                    投稿欄を削除
                  </button>
                )}
              </div>

              <textarea
                value={post.text}
                onChange={(event) =>
                  updatePost(
                    post.id,
                    event.target.value
                  )
                }
                className="h-32 w-full resize-none rounded-lg border border-gray-600 bg-[#1f1f1f] p-4 text-white outline-none placeholder:text-gray-500 focus:border-gray-400"
                placeholder={
                  index === 0
                    ? "1件目の本文"
                    : `${index + 1}件目の本文（リプライとして接続）`
                }
              />

              <div className="mt-2 text-right text-sm text-gray-400">
                {post.text.length}文字・画像{" "}
                {post.images.length}/{imageLimit}枚
              </div>

              <div
                onDragOver={(event) =>
                  handleDragOver(post.id, event)
                }
                onDragLeave={(event) =>
                  handleDragLeave(
                    post.id,
                    event
                  )
                }
                onDrop={(event) =>
                  handleDrop(post.id, event)
                }
                className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition ${
                  draggingPostId === post.id
                    ? "border-white bg-white/10"
                    : "border-gray-600 bg-[#1f1f1f]"
                }`}
              >
                <p className="mb-2 text-sm text-gray-300">
                  {index === 0
                    ? "先頭画像を1枚追加"
                    : "画像をまとめて追加"}
                </p>

                <p className="mb-3 text-xs text-gray-500">
                  {index === 0
                    ? "1枚を超えた分は次の投稿へ自動分割"
                    : "4枚を超えた分は新しい投稿欄へ自動分割"}
                </p>

                <label className="inline-block cursor-pointer rounded-lg bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600">
                  画像を選択
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) =>
                      handleFileSelect(
                        post.id,
                        event
                      )
                    }
                  />
                </label>
              </div>

              {post.images.length > 0 && (
                <>
                  <p className="mt-4 text-sm text-gray-400">
                    画像をドラッグすると順番を変更できます。
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {post.images.map(
                      (image, imageIndex) => (
                        <div
                          key={image.id}
                          draggable
                          onDragStart={(event) =>
                            handleImageDragStart(
                              post.id,
                              image.id,
                              event
                            )
                          }
                          onDragOver={
                            handleImageDragOver
                          }
                          onDrop={(event) =>
                            handleImageDrop(
                              post.id,
                              image.id,
                              event
                            )
                          }
                          onDragEnd={() =>
                            setDraggingImage(null)
                          }
                          className={`relative cursor-grab overflow-hidden rounded-lg border bg-black active:cursor-grabbing ${
                            draggingImage?.imageId ===
                            image.id
                              ? "border-white opacity-50"
                              : "border-gray-600"
                          }`}
                        >
                          <img
                            src={image.previewUrl}
                            alt={image.name}
                            draggable={false}
                            className="aspect-square h-full w-full select-none object-cover"
                          />

                          <span className="absolute left-1 top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-black/80 px-2 text-sm font-bold text-white">
                            {imageIndex + 1}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(
                                post.id,
                                image.id
                              )
                            }
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-sm font-bold text-white hover:bg-red-700"
                            aria-label="画像を削除"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addPost}
          className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600"
        >
          ＋ 投稿欄を追加
        </button>

        <button
          type="button"
          onClick={toggleNumbering}
          className={`rounded-lg px-4 py-2 font-bold ${
            numberingEnabled
              ? "bg-emerald-700 text-white hover:bg-emerald-600"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          {numberingEnabled
            ? "0/3などの連番を外す"
            : "0/3などの連番を入れる"}
        </button>
      </div>

      {editingId && (
        <button
          type="button"
          onClick={resetForm}
          className="mt-4 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
        >
          編集をキャンセル
        </button>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <input
          type="date"
          value={date}
          onChange={(event) =>
            setDate(event.target.value)
          }
          className="rounded-lg border border-gray-600 bg-[#1f1f1f] p-3 text-white"
        />

        <input
          type="time"
          value={time}
          onChange={(event) =>
            setTime(event.target.value)
          }
          className="rounded-lg border border-gray-600 bg-[#1f1f1f] p-3 text-white"
        />

        <button
          type="button"
          onClick={saveReservation}
          disabled={isSaving}
          className="rounded-lg bg-white px-4 py-3 font-bold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-500"
        >
          {isSaving
            ? "保存中..."
            : editingId
              ? "変更を保存"
              : "この日時で予約"}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-[#1f1f1f] p-3 text-sm text-gray-200">
          {message}
        </p>
      )}
    </section>
  );
}
