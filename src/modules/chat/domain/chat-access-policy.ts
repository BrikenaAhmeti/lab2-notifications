import { AppError } from '../../../shared/core/errors/app-error';
import { AuthenticatedUser } from '../../../shared/core/types/request-with-user';
import { ChatParticipantRole } from './chat.entity';

const staffRoles = new Set<ChatParticipantRole>([
    'doctor',
    'staff',
    'nurse',
    'lab_technician',
    'pharmacist',
    'receptionist',
    'admin',
    'department_head',
    'super_admin',
]);

export type DirectRoomAccessInput = {
    currentUser: AuthenticatedUser;
    participantId: string;
    participantRole: ChatParticipantRole;
};

export function assertCanCreateDirectRoom(input: DirectRoomAccessInput) {
    if (input.currentUser.id === input.participantId) {
        throw new AppError('Cannot create a chat room with yourself', 422);
    }

    const roles = normalizeClaims(input.currentUser.roles);
    const permissions = normalizeClaims(input.currentUser.permissions);

    if (permissions.has('chat:manage') || permissions.has('chat:rooms:create')) {
        return;
    }

    if (!roles.size && !permissions.size) {
        return;
    }

    const currentUserIsPatient = roles.has('patient');
    const currentUserIsStaff = [...roles].some((role) => staffRoles.has(role as ChatParticipantRole));
    const participantIsStaff = staffRoles.has(input.participantRole);
    const participantIsPatient = input.participantRole === 'patient';

    if (currentUserIsPatient && participantIsStaff) {
        return;
    }

    if (currentUserIsStaff && participantIsStaff) {
        return;
    }

    if (
        currentUserIsStaff &&
        participantIsPatient &&
        (permissions.has('chat:patients') || permissions.has('patients:read'))
    ) {
        return;
    }

    throw new AppError('You are not allowed to create this chat room', 403);
}

function normalizeClaims(values?: string[]) {
    return new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
}
