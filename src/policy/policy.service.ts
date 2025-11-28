import { Injectable } from '@nestjs/common';
import { PolicyEntity } from './entities/policy.entity';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { PolicyRepository } from './repositories/policy.repository';
import { PolicyAlreadyExistsException } from './exceptions/policy-already-exists.exception';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyNotFoundException } from './exceptions/policy-not-found.exception';

@Injectable()
export class PolicyService {
	constructor(private policyRepository: PolicyRepository) {}

	async createPolicy(dto: CreatePolicyDto): Promise<PolicyEntity> {
		const existedPolicy = await this.policyRepository.findBySlug(dto.slug);
		if (existedPolicy) {
			throw new PolicyAlreadyExistsException(dto.slug);
		}

		const createdPolicy = await this.policyRepository.create(PolicyEntity.createFromDto(dto));
		return PolicyEntity.createFromModel(createdPolicy);
	}

	async updatePolicy(slug: string, dto: UpdatePolicyDto): Promise<PolicyEntity> {
		const existedPolicy = await this.policyRepository.findBySlug(slug);
		if (!existedPolicy) {
			throw new PolicyNotFoundException(slug);
		}
		if (dto.slug && slug !== dto.slug) {
			const policyWithNewSlug = await this.policyRepository.findBySlug(dto.slug);
			if (policyWithNewSlug) {
				throw new PolicyAlreadyExistsException(dto.slug);
			}
		}

		const updatedPolicy = await this.policyRepository.update(
			slug,
			PolicyEntity.createFromDto({ ...existedPolicy, ...dto })
		);
		return PolicyEntity.createFromModel(updatedPolicy);
	}
}
