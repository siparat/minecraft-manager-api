import { BadRequestException } from '@nestjs/common';

export class BadPolicySlugException extends BadRequestException {
	constructor() {
		super(`Slug указан неверно`);
	}
}
