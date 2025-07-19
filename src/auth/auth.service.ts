import { Injectable, NotFoundException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserRepository } from 'src/user/repositories/user.repository';
import { AuthErrorMessages } from './auth.constants';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
	constructor(
		private userRepository: UserRepository,
		private jwtService: JwtService
	) {}

	async validateUser({ username, password }: LoginDto): Promise<boolean> {
		const userIsExist = await this.userRepository.findByUsername(username);
		if (!userIsExist) {
			throw new NotFoundException(AuthErrorMessages.NOT_FOUND);
		}
		const entity = new UserEntity(userIsExist);
		return entity.comparePassword(password);
	}

	async generateToken(payload: JwtPayload): Promise<string> {
		return this.jwtService.signAsync(payload);
	}
}
