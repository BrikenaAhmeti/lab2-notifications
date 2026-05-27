import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { ChatAttachmentStorage } from '../domain/chat-attachment.storage';
import { ChatAttachment, StoreChatAttachmentInput } from '../domain/chat.entity';

export class LocalChatAttachmentStorage implements ChatAttachmentStorage {
    constructor(
        private readonly uploadDir: string,
        private readonly publicBaseUrl?: string,
    ) {}

    async store(input: StoreChatAttachmentInput): Promise<ChatAttachment> {
        await mkdir(this.uploadDir, { recursive: true });

        const fileName = sanitizeFileName(input.fileName);
        const storedName = `${randomUUID()}-${fileName}`;
        const filePath = path.join(this.uploadDir, storedName);

        await writeFile(filePath, input.bytes);

        return {
            fileName,
            fileUrl: this.toPublicUrl(storedName),
            mimeType: input.mimeType,
            size: input.bytes.length,
        };
    }

    private toPublicUrl(storedName: string) {
        const pathUrl = `/uploads/chat/${storedName}`;

        if (!this.publicBaseUrl) {
            return pathUrl;
        }

        return `${this.publicBaseUrl.replace(/\/$/, '')}${pathUrl}`;
    }
}

function sanitizeFileName(fileName: string) {
    const baseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const trimmed = baseName.slice(0, 120);

    return trimmed || 'attachment';
}
