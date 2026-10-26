import { ForbiddenException } from '@nestjs/common';
import { User, UserRole } from 'generated/prisma';
import { UserErrorMessages } from '../user.constants';

export function assertManagerOwnsResource(actor: User, ownerId: number | null | undefined): void {
	if (actor.role !== UserRole.MANAGER) {
		return;
	}
	if (ownerId == null || ownerId !== actor.id) {
		throw new ForbiddenException(UserErrorMessages.FORBIDDEN_BY_OWNERSHIP);
	}
}
