<<<<<<< HEAD
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import UserClient from "./user-client";
=======
import UserProfileClient from "./user-client";
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
<<<<<<< HEAD
  const session = await getServerSession(authOptions);

  return <UserClient userId={id} viewerId={session?.user?.id ?? null} />;
=======
  return <UserProfileClient userId={id} />;
>>>>>>> e55ac280fb05062c9959b150f067539a31286f1d
}