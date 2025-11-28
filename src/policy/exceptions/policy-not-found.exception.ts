import { NotFoundException } from '@nestjs/common';

export class PolicyNotFoundException extends NotFoundException {
	constructor(slug: string) {
		super(`Политика ${slug} не найдена`);
	}
}
