import { UserRole } from 'generated/prisma';
import { IUserEntity } from '../interfaces/user-entity.interface';
import { compare, hash } from 'bcrypt';

export class UserEntity implements IUserEntity {
	id: number | undefined;
	username: string;
	password: string;
	role: UserRole | undefined;

	constructor(user: IUserEntity) {
		Object.assign(this, user);
	}

	async setPassword(password: string): Promise<this> {
		this.password = await hash(password, 8);
		return this;
	}

	comparePassword(password: string): Promise<boolean> {
		return compare(password, this.password);
	}
}
