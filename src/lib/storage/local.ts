import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { SaveImageInput, SaveImageResult, StorageProvider } from "./provider";

// Os arquivos vão para public/uploads e são servidos estaticamente em /uploads/*.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export const localStorageProvider: StorageProvider = {
  async saveImage({ buffer, ext }: SaveImageInput): Promise<SaveImageResult> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return { url: `/uploads/${filename}` };
  },
};
