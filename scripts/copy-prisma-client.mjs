import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

const source = 'src/generated/prisma';
const target = 'dist/src/generated/prisma';

if (!existsSync(source)) {
    throw new Error('Prisma client is missing. Run npm run prisma:generate before building.');
}

rmSync(target, { recursive: true, force: true });
mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
