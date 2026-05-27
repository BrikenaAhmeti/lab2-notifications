import {
    createDirectChatRoomSchema,
    sendChatMessageSchema,
} from '../../src/modules/chat/presentation/chat.schemas';

describe('chat schemas', () => {
    it('accepts direct room creation payloads with participant role', () => {
        const result = createDirectChatRoomSchema.parse({
            participantId: 'e54b8b3b-6927-4c67-ad12-61e2e7bf86f0',
            participantRole: 'doctor',
        });

        expect(result.participantRole).toBe('doctor');
    });

    it('requires a file URL for file messages', () => {
        expect(() =>
            sendChatMessageSchema.parse({
                content: 'See attachment',
                type: 'file',
            }),
        ).toThrow();
    });

    it('accepts uploaded attachment URLs for image messages', () => {
        const result = sendChatMessageSchema.parse({
            content: 'X-ray image',
            type: 'image',
            fileUrl: '/uploads/chat/xray.png',
        });

        expect(result.fileUrl).toBe('/uploads/chat/xray.png');
    });
});
