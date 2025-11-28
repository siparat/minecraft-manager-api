import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseGuards, UsePipes } from '@nestjs/common';
import { PolicyEntity } from './entities/policy.entity';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/user/guards/role.guard';
import { UserRole } from 'generated/prisma';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { PolicyService } from './policy.service';
import { BadPolicySlugException } from './exceptions/bad-policy-slug.exception';
import { PolicyRepository } from './repositories/policy.repository';
import { PolicyNotFoundException } from './exceptions/policy-not-found.exception';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { Response } from 'express';
import { getContentTypeForPolicy } from './utils/get-content-type-for-policy.utils';

@Controller('policy')
export class PolicyController {
	constructor(
		private policyService: PolicyService,
		private policyRepository: PolicyRepository
	) {}

	@UseGuards(JwtAuthGuard)
	@Get()
	async getAllPolicies(): Promise<PolicyEntity[]> {
		const allPolicies = await this.policyRepository.getAllPolicies();
		return allPolicies.map(PolicyEntity.createFromModel);
	}

	@Get(':slug')
	async getBySlug(@Param('slug') slug?: string): Promise<PolicyEntity> {
		if (!slug) {
			throw new BadPolicySlugException();
		}
		const policy = await this.policyRepository.findBySlug(slug);
		if (!policy) {
			throw new PolicyNotFoundException(slug);
		}
		return PolicyEntity.createFromModel(policy);
	}

	@Get('content/:slug')
	async getContentBySlug(@Res() res: Response, @Param('slug') slug?: string): Promise<void> {
		if (!slug) {
			throw new BadPolicySlugException();
		}
		const policy = await this.policyRepository.findBySlug(slug);
		if (!policy) {
			throw new PolicyNotFoundException(slug);
		}
		const contentType = getContentTypeForPolicy(slug);
		res.setHeader('Content-Type', contentType);
		res.send(policy.content);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Post()
	async create(@Body() dto: CreatePolicyDto): Promise<PolicyEntity> {
		return this.policyService.createPolicy(dto);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Put(':slug')
	async update(@Body() dto: UpdatePolicyDto, @Param('slug') slug?: string): Promise<PolicyEntity> {
		if (!slug) {
			throw new BadPolicySlugException();
		}
		return this.policyService.updatePolicy(slug, dto);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Delete(':slug')
	async delete(@Param('slug') slug?: string): Promise<void> {
		if (!slug) {
			throw new BadPolicySlugException();
		}
		const existedPolicy = await this.policyRepository.findBySlug(slug);
		if (!existedPolicy) {
			throw new PolicyNotFoundException(slug);
		}
		return this.policyRepository.delete(slug);
	}
}
