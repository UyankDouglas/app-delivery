/**
 * Abstração de armazenamento de imagens. A implementação padrão grava em disco
 * (public/uploads). A mesma interface permite plugar S3 / Cloudinary / Vercel Blob
 * depois, sem alterar a rota de upload nem a UI.
 */
export type SaveImageInput = {
  buffer: Buffer;
  /** Extensão sem ponto (ex.: "png", "jpg"). */
  ext: string;
};

export type SaveImageResult = {
  /** URL pública para usar em <img src> (ex.: "/uploads/abc.png"). */
  url: string;
};

export interface StorageProvider {
  saveImage(input: SaveImageInput): Promise<SaveImageResult>;
}
