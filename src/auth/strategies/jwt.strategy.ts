import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { User } from 'generated/prisma';
import { Strategy, StrategyOptionsWithoutRequest, ExtractJwt } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserRepository } from 'src/user/repositories/user.repository';
import { AuthErrorMessages } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		config: ConfigService,
		private userRepository: UserRepository
	) {
		const secret = config.get('SECRET');
		const options: StrategyOptionsWithoutRequest = {
			secretOrKey: secret,
			ignoreExpiration: true,
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
		};
		super(options);
	}

	async validate({ username }: JwtPayload): Promise<User> {
		if (!username) {
			throw new UnauthorizedException(AuthErrorMessages.UNAUTHORIZED);
		}
		const user = await this.userRepository.findByUsername(username);
		if (!user) {
			throw new UnauthorizedException(AuthErrorMessages.UNAUTHORIZED);
		}
		return user;
	}
}
