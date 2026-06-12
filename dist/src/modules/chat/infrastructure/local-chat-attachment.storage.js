"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalChatAttachmentStorage = void 0;
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
class LocalChatAttachmentStorage {
    uploadDir;
    publicBaseUrl;
    constructor(uploadDir, publicBaseUrl) {
        this.uploadDir = uploadDir;
        this.publicBaseUrl = publicBaseUrl;
    }
    async store(input) {
        await (0, promises_1.mkdir)(this.uploadDir, { recursive: true });
        const fileName = sanitizeFileName(input.fileName);
        const storedName = `${(0, crypto_1.randomUUID)()}-${fileName}`;
        const filePath = path_1.default.join(this.uploadDir, storedName);
        await (0, promises_1.writeFile)(filePath, input.bytes);
        return {
            fileName,
            fileUrl: this.toPublicUrl(storedName),
            mimeType: input.mimeType,
            size: input.bytes.length,
        };
    }
    toPublicUrl(storedName) {
        const pathUrl = `/uploads/chat/${storedName}`;
        if (!this.publicBaseUrl) {
            return pathUrl;
        }
        return `${this.publicBaseUrl.replace(/\/$/, '')}${pathUrl}`;
    }
}
exports.LocalChatAttachmentStorage = LocalChatAttachmentStorage;
function sanitizeFileName(fileName) {
    const baseName = path_1.default.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const trimmed = baseName.slice(0, 120);
    return trimmed || 'attachment';
}
