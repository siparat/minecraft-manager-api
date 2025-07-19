import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { User } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository {
	constructor(private database: DatabaseService) {}

	async createUser(entity: UserEntity): Promise<User> {
		try {
			return await this.database.user.create({ data: entity });
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при создании пользователя');
		}
	}

	findByUsername(username: string): Promise<User | null> {
		return this.database.user.findUnique({ where: { username } });
	}
}
