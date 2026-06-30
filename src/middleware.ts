import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Protege rotas por papel. A autorização fina (dono x dono do recurso) é feita
// também nas Server Actions e nas páginas — defesa em profundidade.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const isLoggedIn = !!user;

  const requireLogin = () => {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  };

  // Painel do dono
  if (pathname.startsWith("/owner")) {
    if (!isLoggedIn) return requireLogin();
    if (user.role !== "OWNER") return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Painel do entregador
  if (pathname.startsWith("/delivery")) {
    if (!isLoggedIn) return requireLogin();
    if (user.role !== "DELIVERY") return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Área do cliente (histórico/conta)
  if (pathname.startsWith("/account")) {
    if (!isLoggedIn) return requireLogin();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/owner/:path*", "/delivery/:path*", "/account/:path*"],
};
