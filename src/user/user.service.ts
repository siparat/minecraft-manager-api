import { ConflictException, Injectable } from '@nestjs/common';
import { CreateBuilderAccountDto } from './dto/create-builder-account.dto';
import { UserEntity } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserErrorMessages } from './user.constants';
import { UserRole } from 'generated/prisma';

@Injectable()
export class UserService {
	constructor(private userRepository: UserRepository) {}

	async createBuilderAccount(dto: CreateBuilderAccountDto): Promise<UserEntity> {
		const userIsExist = await this.userRepository.findByUsername(dto.username);
		if (userIsExist) {
			throw new ConflictException(UserErrorMessages.USER_IS_EXIST);
		}
		const entity = await new UserEntity({ ...dto, role: UserRole.BUILDER }).setPassword(dto.password);
		const user = await this.userRepository.createUser(entity);
		return new UserEntity(user);
	}
}
