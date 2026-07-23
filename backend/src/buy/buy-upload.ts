import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { diskStorage } from 'multer';
import type { Request } from 'express';

export const BUY_UPLOAD_DIR = join(process.cwd(), 'uploads', 'buy');
export const BUY_UPLOAD_URL_PREFIX = '/uploads/buy';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export function ensureBuyUploadDir() {
  if (!existsSync(BUY_UPLOAD_DIR)) {
    mkdirSync(BUY_UPLOAD_DIR, { recursive: true });
  }
}

export function buyImageUrlFromFilename(filename: string) {
  return `${BUY_UPLOAD_URL_PREFIX}/${filename}`;
}

export function removeBuyUploadIfLocal(imageUrl: string) {
  const prefix = `${BUY_UPLOAD_URL_PREFIX}/`;
  if (!imageUrl.startsWith(prefix)) {
    return;
  }
  const filename = imageUrl.slice(prefix.length);
  if (
    !filename ||
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return;
  }
  const fullPath = join(BUY_UPLOAD_DIR, filename);
  try {
    unlinkSync(fullPath);
  } catch {}
}

export function createBuyMulterOptions() {
  ensureBuyUploadDir();
  return {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void,
      ) => {
        ensureBuyUploadDir();
        cb(null, BUY_UPLOAD_DIR);
      },
      filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void,
      ) => {
        const fromMime = EXT_BY_MIME[file.mimetype];
        const fromName = extname(file.originalname).toLowerCase();
        let ext = fromMime;
        if (!ext) {
          if (fromName === '.jpeg') {
            ext = '.jpg';
          } else if (
            ['.jpg', '.png', '.webp', '.heic', '.heif'].includes(fromName)
          ) {
            ext = fromName;
          } else {
            ext = '.jpg';
          }
        }
        cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`);
      },
    }),
    limits: {
      fileSize: 8 * 1024 * 1024,
    },
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        cb(
          new BadRequestException('Нужно фото: JPG, PNG, WEBP или HEIC'),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}
