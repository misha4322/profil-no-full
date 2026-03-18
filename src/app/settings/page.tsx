import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";
<<<<<<< HEAD

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <SettingsClient userId={session.user.id} />;
=======
import "./SettingsPage.css";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  return <SettingsClient />;
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
}