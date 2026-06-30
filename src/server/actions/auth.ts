"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";

export type ActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

/** Cadastro de cliente ou dono. Dono já cria o restaurante associado. */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Verifique os campos." };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const passwordHash = await hashPassword(data.password);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          passwordHash,
          role: data.role,
        },
      });

      if (data.role === "OWNER") {
        // Gera um slug único para a URL pública do restaurante.
        const base = slugify(data.restaurantName || data.name) || "restaurante";
        let slug = base;
        let i = 1;
        while (await tx.restaurant.findUnique({ where: { slug } })) {
          slug = `${base}-${i++}`;
        }
        await tx.restaurant.create({
          data: {
            ownerId: user.id,
            name: data.restaurantName!,
            slug,
          },
        });
      }
    });
  } catch {
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // Faz login automaticamente. signIn redireciona (lança NEXT_REDIRECT) em caso de sucesso.
  try {
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: data.role === "OWNER" ? "/owner" : "/account/orders",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Conta criada, mas houve erro no login. Faça login manualmente." };
    }
    throw error; // repassa o redirect
  }
  return {};
}

/** Encerra a sessão e volta para a home. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

/** Login por credenciais. */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "") || undefined;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl || "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha incorretos." };
    }
    throw error;
  }
  return {};
}
