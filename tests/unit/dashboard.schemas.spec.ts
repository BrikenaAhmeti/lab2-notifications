import {
    listActivityQuerySchema,
    recordActivityEventSchema,
} from '../../src/modules/dashboard/presentation/dashboard.schemas';

describe('dashboard schemas', () => {
    it('defaults activity pagination for the frontend feed', () => {
        expect(listActivityQuerySchema.parse({})).toEqual({
            page: 1,
            limit: 20,
        });
    });

    it('accepts supported facility domain activity events', () => {
        const result = recordActivityEventSchema.parse({
            type: 'payment.recorded',
            data: {
                actorName: 'Rita Receptionist',
                amount: 75,
            },
            occurredAt: '2026-05-27T09:30:00.000Z',
        });

        expect(result).toEqual({
            type: 'payment.recorded',
            data: {
                actorName: 'Rita Receptionist',
                amount: 75,
            },
            occurredAt: new Date('2026-05-27T09:30:00.000Z'),
        });
    });
});
