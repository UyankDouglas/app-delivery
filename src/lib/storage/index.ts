import { localStorageProvider } from "./local";
import type { StorageProvider } from "./provider";

/**
 * Provedor de storage ativo. Hoje é o local (disco). Para usar um serviço
 * externo, implemente StorageProvider e troque esta atribuição.
 */
export const storage: StorageProvider = localStorageProvider;

// Tipos/extensões de imagem aceitos no upload.
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
