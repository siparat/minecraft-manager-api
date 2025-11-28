import { ConflictException } from '@nestjs/common';

export class PolicyAlreadyExistsException extends ConflictException {
	constructor(slug: string) {
		super(`Политика по пути ${slug} уже существует`);
	}
}
