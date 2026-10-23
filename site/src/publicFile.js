import { existsSync } from 'node:fs';
import { join } from 'node:path';

// public/ にそのファイルがあるか（ビルドのときに確かめる）。path は「/media/hero.mp4」の形
export const hasPublicFile = (path) => Boolean(path) && existsSync(join(process.cwd(), 'public', path));
