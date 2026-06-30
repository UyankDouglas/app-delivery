import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Configuração compartilhada e segura para o Edge (sem Prisma/bcrypt).
 * Usada tanto pelo NextAuth completo (auth.ts) quanto pelo middleware.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    // Coloca dados de papel/identidade no token (sem consultar o banco no Edge).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.restaurantId = user.restaurantId ?? null;
        token.deliveryPersonId = user.deliveryPersonId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.restaurantId = (token.restaurantId as string | null) ?? null;
        session.user.deliveryPersonId = (token.deliveryPersonId as string | null) ?? null;
      }
      return session;
    },
  },
  providers: [], // Os providers são adicionados em auth.ts (fora do Edge).
} satisfies NextAuthConfig;
