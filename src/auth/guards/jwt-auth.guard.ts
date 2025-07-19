import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JsonWebTokenError } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { AuthErrorMessages } from '../auth.constants';

export class JwtAuthGuard extends AuthGuard('jwt') {
	override handleRequest<TUser>(
		err: unknown,
		user: false | string,
		info: undefined | JsonWebTokenError | Error,
		context: ExecutionContext
	): TUser {
		if (info instanceof JsonWebTokenError || info instanceof Error) {
			throw new UnauthorizedException(AuthErrorMessages.UNAUTHORIZED);
		}
		return super.handleRequest(err, user, info, context);
	}
}
