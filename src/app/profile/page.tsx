import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import CopyMyIdButton from "./CopyMyIdButton";
import "./ProfilePage.css";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const user = session.user;
  const myId = (session.user as any)?.id as string | undefined;

  return (
    <div className="profile-container">
      <div className="profile-background">
        <div className="profile-pattern"></div>
      </div>

      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "Avatar"}
                  width={100}
                  height={100}
                  className="profile-avatar-img"
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                  priority
                />
              ) : (
                <div className="avatar-placeholder">
                  {user?.name?.[0]?.toUpperCase() ?? "G"}
                </div>
              )}
            </div>

            <div className="profile-info">
              <h1 className="profile-name">{user?.name ?? "Геймер"}</h1>

              {/* ✅ email по желанию можешь убрать, но оставил как было */}
              <p className="profile-email">{user?.email}</p>

              <div className="profile-badge">Участник GameHub</div>

              {/* ✅ Кнопка копирования твоего UUID */}
              {myId ? <CopyMyIdButton myId={myId} /> : null}
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Игр в библиотеке</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Достижений</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Друзей</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Часов в играх</div>
            </div>
          </div>

          <div className="profile-actions">
            <Link href="/games" className="action-btn action-primary">
              🎮 Перейти к играм
            </Link>

            <Link href="/community" className="action-btn action-secondary">
              👥 Сообщество
            </Link>

            {/* ✅ НОВОЕ: друзья/поиск */}
            <Link href="/friends" className="action-btn action-secondary">
              🤝 Друзья / поиск людей
            </Link>

            <Link href="/settings" className="action-btn action-tertiary">
              ⚙️ Настройки
            </Link>

            <Link href="/api/auth/signout" className="logout-btn">
              🚪 Выйти из аккаунта
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}