import { Policy } from 'generated/prisma';
import { CreatePolicyDto } from '../dto/create-policy.dto';

export class PolicyEntity {
	private constructor(
		public id: number | undefined,
		public createdAt: Date | undefined,
		public updatedAt: Date | undefined,
		public title: string,
		public content: string,
		public slug: string
	) {}

	static createFromDto(dto: CreatePolicyDto): PolicyEntity {
		return new PolicyEntity(undefined, undefined, undefined, dto.title, dto.content, dto.slug);
	}
	static createFromModel(model: Policy): PolicyEntity {
		return new PolicyEntity(model.id, model.createdAt, model.updatedAt, model.title, model.content, model.slug);
	}
}
