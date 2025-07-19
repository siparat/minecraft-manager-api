import { CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from 'generated/prisma';
import { AuthErrorMessages } from 'src/auth/auth.constants';
import { UserErrorMessages } from '../user.constants';

export class RoleGuard implements CanActivate {
	constructor(private roles: UserRole[]) {}

	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest<Request>();
		if (!req.user) {
			throw new UnauthorizedException(AuthErrorMessages.UNAUTHORIZED);
		}
		if (!this.roles.includes(req.user.role)) {
			throw new ForbiddenException(UserErrorMessages.FORBIDDEN_BY_ROLE);
		}
		return true;
	}
}
