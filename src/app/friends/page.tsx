import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import FriendsClient from "./FriendsClient";

export default async function FriendsPage() {
  const session = await getServerSession(authOptions);
<<<<<<< HEAD

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return <FriendsClient userId={session.user.id} />;
=======
  if (!session) redirect("/auth/login");
  return <FriendsClient />;
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
}