"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCanCreateDirectRoom = assertCanCreateDirectRoom;
const app_error_1 = require("../../../shared/core/errors/app-error");
const staffRoles = new Set([
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
function assertCanCreateDirectRoom(input) {
    if (input.currentUser.id === input.participantId) {
        throw new app_error_1.AppError('Cannot create a chat room with yourself', 422);
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
    const currentUserIsStaff = [...roles].some((role) => staffRoles.has(role));
    const participantIsStaff = staffRoles.has(input.participantRole);
    const participantIsPatient = input.participantRole === 'patient';
    if (currentUserIsPatient && participantIsStaff) {
        return;
    }
    if (currentUserIsStaff && participantIsStaff) {
        return;
    }
    if (currentUserIsStaff &&
        participantIsPatient &&
        (permissions.has('chat:patients') || permissions.has('patients:read'))) {
        return;
    }
    throw new app_error_1.AppError('You are not allowed to create this chat room', 403);
}
function normalizeClaims(values) {
    return new Set((values ?? [])
        .map((value) => value.trim().toLowerCase().replace(/[\s-]+/g, '_'))
        .filter(Boolean));
}
