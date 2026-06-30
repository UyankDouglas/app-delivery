import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { storage, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Upload de imagem (logo do restaurante / foto de produto). Apenas o dono pode
 * enviar. Valida tipo (PNG/JPG/WEBP/GIF) e tamanho (<= 4MB) e devolve a URL.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // Rejeita cedo, antes de bufferizar o corpo, se for claramente grande demais
  // (margem para o overhead do multipart).
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES + 1024 * 100) {
    return NextResponse.json({ error: "Imagem muito grande (máx. 4MB)." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato inválido. Envie PNG, JPG, WEBP ou GIF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande (máx. 4MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await storage.saveImage({ buffer, ext });
  return NextResponse.json({ url });
}
