import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { homeForRole } from "@/types";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  restaurantId?: string | null;
  deliveryPersonId?: string | null;
};

/** Retorna o usuário logado ou null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

/** Garante que há um usuário logado; redireciona para /login caso contrário. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Garante que o usuário logado tem um dos papéis exigidos. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}
