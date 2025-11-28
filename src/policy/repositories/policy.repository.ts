import { Injectable, Logger } from '@nestjs/common';
import { PolicyEntity } from '../entities/policy.entity';
import { DatabaseService } from 'src/database/database.service';
import { Policy } from 'generated/prisma';

@Injectable()
export class PolicyRepository {
	constructor(private database: DatabaseService) {}

	async getAllPolicies(): Promise<Policy[]> {
		return this.database.policy.findMany();
	}

	async findBySlug(slug: string): Promise<Policy | null> {
		return this.database.policy.findUnique({ where: { slug } });
	}

	async update(slug: string, entity: PolicyEntity): Promise<Policy> {
		try {
			return await this.database.policy.update({
				where: { slug: slug },
				data: entity
			});
		} catch (error) {
			Logger.error(`Произошла неизвестная ошибка при изменении политики: ${error.message}`);
			throw error;
		}
	}

	async create(entity: PolicyEntity): Promise<Policy> {
		try {
			return await this.database.policy.create({
				data: entity
			});
		} catch (error) {
			Logger.error(`Произошла неизвестная ошибка при создании политики: ${error.message}`);
			throw error;
		}
	}

	async delete(slug: string): Promise<void> {
		try {
			await this.database.policy.delete({
				where: { slug }
			});
		} catch (error) {
			Logger.error(`Произошла неизвестная ошибка при создании политики: ${error.message}`);
			throw error;
		}
	}
}
