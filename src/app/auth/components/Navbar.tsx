"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

function getUnreadCountFromConversation(conversation: any) {
  const possibleNumbers = [
    conversation?.unreadCount,
    conversation?.unread,
    conversation?.unreadMessagesCount,
    conversation?.pendingCount,
  ];

  for (const value of possibleNumbers) {
    if (typeof value === "number" && value > 0) {
      return value;
    }
  }

  if (conversation?.hasUnread === true) {
    return 1;
  }

  return 0;
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar({ session }: { session: any }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    let intervalId: number | undefined;

    const loadUnread = async () => {
      try {
        const res = await fetch(`/api/messages/conversations/${userId}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        const list = Array.isArray(data?.conversations) ? data.conversations : [];

        const total = list.reduce((sum: number, conversation: any) => {
          return sum + getUnreadCountFromConversation(conversation);
        }, 0);

        if (active) {
          setUnreadCount(total);
        }
      } catch {
        // молча игнорируем, чтобы не шуметь в UI
      }
    };

    void loadUnread();
    intervalId = window.setInterval(loadUnread, 15000);

    return () => {
      active = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [userId]);

  const navItems = useMemo(() => {
    const items = [
      { href: "/", label: "Главная" },
      { href: "/posts", label: "Форум" },
      { href: "/posts/new", label: "Создать пост" },
    ];

    if (userId) {
      items.push(
        { href: "/friends", label: "Друзья" },
        { href: "/messages", label: "Сообщения" }
      );
    }

    return items;
  }, [userId]);

  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <Link className="nav-brand" href="/">
            <span className="nav-brand-mark">GH</span>
            <span className="nav-brand-text">
              <span className="nav-brand-title">GameHelp</span>
              <span className="nav-brand-subtitle">форум • друзья • сообщения</span>
            </span>
          </Link>

          <nav className="nav-links">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              const isMessages = item.href === "/messages";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "active" : ""}`}
                >
                  <span>{item.label}</span>
                  {isMessages && unreadCount > 0 ? (
                    <span className="nav-badge">{unreadLabel}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="nav-right">
          {session ? (
            <>
              <Link className="nav-profile-chip" href="/profile">
                <span className="chip-avatar">
                  {(session.user?.name?.[0] ?? session.user?.username?.[0] ?? "U").toUpperCase()}
                </span>
                <span>Профиль</span>
              </Link>

              <button
                className="btn btn-ghost"
                onClick={() => signOut({ callbackUrl: "/" })}
                type="button"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/auth/login">
                Войти
              </Link>
              <Link className="btn btn-primary" href="/auth/register">
                Регистрация
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Открыть меню"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <span className="nav-toggle-icon">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="container nav-mobile">
          <div className="nav-mobile-panel">
            <div className="nav-mobile-row">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);
                const isMessages = item.href === "/messages";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${active ? "active" : ""}`}
                  >
                    <span>{item.label}</span>
                    {isMessages && unreadCount > 0 ? (
                      <span className="nav-badge">{unreadLabel}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            {session ? (
              <div className="nav-mobile-row">
                <Link className="nav-profile-chip" href="/profile">
                  <span className="chip-avatar">
                    {(session.user?.name?.[0] ?? session.user?.username?.[0] ?? "U").toUpperCase()}
                  </span>
                  <span>Открыть профиль</span>
                </Link>

                <button
                  className="btn btn-ghost"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  type="button"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="nav-mobile-row">
                <Link className="btn btn-ghost" href="/auth/login">
                  Войти
                </Link>
                <Link className="btn btn-primary" href="/auth/register">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}