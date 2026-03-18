"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./MessagesClient.module.css";

async function readJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Сервер вернул не JSON. Проверь маршрут: ${res.url}`);
  }
}

type ConversationItem = {
  id: string;
  updatedAt: string | null;
  lastMessageAt: string | null;
  lastReadAt: string | null;
  otherUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  lastMessage: {
    id: string;
    senderId: string;
    type: "text" | "post_share";
    content: string | null;
    createdAt: string | null;
    sharedPost:
      | {
          id: string;
          slug: string;
          title: string;
          coverImage: string | null;
        }
      | null;
  } | null;
};

type MessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  type: "text" | "post_share";
  content: string | null;
  createdAt: string | null;
  editedAt: string | null;
  sender: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  sharedPost:
    | {
        id: string;
        slug: string;
        title: string;
        coverImage: string | null;
      }
    | null;
};

export default function MessagesClient({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const withUserId = searchParams.get("with");
  const sharePostId = searchParams.get("sharePostId");
  const shareTitle = searchParams.get("shareTitle");

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === currentConversationId) ?? null,
    [conversations, currentConversationId]
  );

  async function loadConversations(selectId?: string | null) {
    try {
      setLoadingList(true);
      const res = await fetch(`/api/messages/conversations/${userId}`, {
        cache: "no-store",
      });
      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка загрузки диалогов");
      }

      const list = (json.conversations ?? []) as ConversationItem[];
      setConversations(list);

      if (selectId) {
        setCurrentConversationId(selectId);
      } else if (!currentConversationId && list[0]) {
        setCurrentConversationId(list[0].id);
      } else if (
        currentConversationId &&
        !list.some((conversation) => conversation.id === currentConversationId)
      ) {
        setCurrentConversationId(list[0]?.id ?? null);
      }
    } catch (error: any) {
      setMessage(error?.message || "Ошибка загрузки диалогов");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      setLoadingMessages(true);

      const res = await fetch(
        `/api/messages/${conversationId}?userId=${encodeURIComponent(userId)}`,
        {
          cache: "no-store",
        }
      );
      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка загрузки сообщений");
      }

      setMessages(json.messages ?? []);

      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, conversationId }),
      }).catch(() => null);
    } catch (error: any) {
      setMessage(error?.message || "Ошибка загрузки сообщений");
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [userId]);

  useEffect(() => {
    if (!withUserId) return;

    (async () => {
      try {
        const res = await fetch(`/api/messages/direct/${userId}/${withUserId}`, {
          cache: "no-store",
        });
        const json = await readJsonSafe(res);

        if (!res.ok) {
          throw new Error(json?.error || "Не удалось открыть диалог");
        }

        const conversationId = json?.conversation?.id as string;
        await loadConversations(conversationId);
      } catch (error: any) {
        setMessage(error?.message || "Не удалось открыть диалог");
      }
    })();
  }, [withUserId, userId]);

  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(currentConversationId);
  }, [currentConversationId]);

  async function send() {
    if (!currentConversationId && !withUserId) {
      setMessage("Сначала выбери диалог");
      return;
    }

    if (!text.trim() && !sharePostId) {
      return;
    }

    try {
      setSending(true);
      setMessage("");

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          conversationId: currentConversationId,
          targetUserId: currentConversationId ? undefined : withUserId ?? undefined,
          content: text.trim() || null,
          sharedPostId: sharePostId || null,
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok) {
        throw new Error(json?.error || "Ошибка отправки сообщения");
      }

      setText("");

      const params = new URLSearchParams(searchParams.toString());
      params.delete("sharePostId");
      params.delete("shareTitle");
      router.replace(`/messages${params.toString() ? `?${params.toString()}` : ""}`);

      await loadConversations(currentConversationId);
      if (currentConversationId) {
        await loadMessages(currentConversationId);
      }
    } catch (error: any) {
      setMessage(error?.message || "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div>
              <h1 className={styles.title}>Сообщения</h1>
              <div className={styles.subtitle}>
                Общайся с друзьями и отправляй им интересные посты.
              </div>
            </div>

            <Link href="/friends" className={styles.linkButton}>
              Друзья
            </Link>
          </div>

          {loadingList ? (
            <div className={styles.empty}>Загрузка диалогов...</div>
          ) : conversations.length === 0 ? (
            <div className={styles.empty}>
              У тебя пока нет диалогов. Открой профиль друга и нажми «Написать».
            </div>
          ) : (
            <div className={styles.conversationList}>
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`${styles.conversationItem} ${
                    currentConversationId === conversation.id ? styles.activeConversation : ""
                  }`}
                  onClick={() => setCurrentConversationId(conversation.id)}
                >
                  <div className={styles.conversationTop}>
                    {conversation.otherUser?.avatarUrl ? (
                      <img
                        src={conversation.otherUser.avatarUrl}
                        alt={conversation.otherUser.username}
                        className={styles.conversationAvatar}
                      />
                    ) : (
                      <div className={styles.conversationAvatarPlaceholder}>
                        {(conversation.otherUser?.username?.[0] ?? "U").toUpperCase()}
                      </div>
                    )}

                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationName}>
                        {conversation.otherUser?.username ?? "Диалог"}
                      </div>

                      {conversation.lastMessage ? (
                        <div className={styles.conversationPreview}>
                          {conversation.lastMessage.type === "post_share"
                            ? `📎 ${conversation.lastMessage.sharedPost?.title ?? "Пост"}`
                            : conversation.lastMessage.content ?? "Сообщение"}
                        </div>
                      ) : (
                        <div className={styles.conversationPreview}>Пока нет сообщений</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={styles.chat}>
          {currentConversation ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatTitleWrap}>
                  <div className={styles.chatTitle}>
                    {currentConversation.otherUser?.username ?? "Диалог"}
                  </div>
                  {currentConversation.otherUser ? (
                    <Link
                      href={`/u/${currentConversation.otherUser.id}`}
                      className={styles.chatLink}
                    >
                      Открыть профиль
                    </Link>
                  ) : null}
                </div>
              </div>

              {sharePostId ? (
                <div className={styles.shareBanner}>
                  <div className={styles.shareTitle}>Готово к отправке другу:</div>
                  <div className={styles.sharePostTitle}>
                    {shareTitle || "Интересный пост"}
                  </div>
                  <div className={styles.shareHint}>
                    Можешь добавить комментарий и отправить пост в этот диалог.
                  </div>
                </div>
              ) : null}

              {message ? <div className={styles.systemMessage}>{message}</div> : null}

              <div className={styles.messagesArea}>
                {loadingMessages ? (
                  <div className={styles.empty}>Загрузка сообщений...</div>
                ) : messages.length === 0 ? (
                  <div className={styles.empty}>Пока нет сообщений. Начни разговор первым.</div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.senderId === userId;

                    return (
                      <div
                        key={msg.id}
                        className={`${styles.messageRow} ${
                          mine ? styles.myMessageRow : styles.otherMessageRow
                        }`}
                      >
                        <div
                          className={`${styles.messageBubble} ${
                            mine ? styles.myMessageBubble : styles.otherMessageBubble
                          }`}
                        >
                          {msg.type === "post_share" && msg.sharedPost ? (
                            <Link
                              href={`/posts/${msg.sharedPost.slug}`}
                              className={styles.sharedPostCard}
                            >
                              {msg.sharedPost.coverImage ? (
                                <img
                                  src={msg.sharedPost.coverImage}
                                  alt={msg.sharedPost.title}
                                  className={styles.sharedPostImage}
                                />
                              ) : (
                                <div className={styles.sharedPostImagePlaceholder}>🎮</div>
                              )}

                              <div className={styles.sharedPostBody}>
                                <div className={styles.sharedPostLabel}>Пересланный пост</div>
                                <div className={styles.sharedPostTitleText}>
                                  {msg.sharedPost.title}
                                </div>
                              </div>
                            </Link>
                          ) : null}

                          {msg.content ? (
                            <div className={styles.messageText}>{msg.content}</div>
                          ) : null}

                          <div className={styles.messageMeta}>
                            {msg.sender?.username ?? "Пользователь"} •{" "}
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleString("ru-RU")
                              : "—"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className={styles.composer}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={styles.textarea}
                  rows={3}
                  placeholder={
                    sharePostId
                      ? "Добавь комментарий к пересылаемому посту..."
                      : "Напиши сообщение..."
                  }
                  disabled={sending}
                />

                <div className={styles.composerActions}>
                  <button
                    type="button"
                    className={styles.sendButton}
                    disabled={sending || (!text.trim() && !sharePostId)}
                    onClick={send}
                  >
                    {sending
                      ? "Отправка..."
                      : sharePostId
                      ? "Отправить пост"
                      : "Отправить"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyLarge}>
              {sharePostId
                ? "Выбери друга слева, чтобы переслать пост и обсудить его."
                : "Выбери диалог слева или открой чат из профиля друга."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}