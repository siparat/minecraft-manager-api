import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Mod } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { ModEntity } from '../entities/mod.entity';
import { ModWithVersions } from '../interfaces/mod.interface';

@Injectable()
export class ModRepository {
	constructor(private database: DatabaseService) {}

	search(take: number, skip: number, q?: string, versions?: string[]): Promise<ModWithVersions[]> {
		return this.database.mod.findMany({
			where: { versions: { some: { version: { in: versions } } }, title: { contains: q, mode: 'insensitive' } },
			take,
			skip,
			include: { versions: true }
		});
	}

	async create(modEntity: ModEntity): Promise<Mod> {
		try {
			return await this.database.mod.create({
				data: {
					...modEntity,
					versions: {
						connectOrCreate: modEntity.versions.map(({ version }) => ({
							where: { version },
							create: { version }
						}))
					}
				}
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при создании мода');
		}
	}

	async update(id: number, modEntity: ModEntity): Promise<Mod> {
		try {
			return await this.database.mod.update({
				where: { id },
				data: {
					...modEntity,
					versions: {
						set: [],
						connectOrCreate: modEntity.versions.map(({ version }) => ({
							where: { version },
							create: { version }
						}))
					}
				}
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при редактировании мода');
		}
	}

	async findById(id: number): Promise<ModWithVersions | null> {
		return this.database.mod.findUnique({ where: { id }, include: { versions: true } });
	}

	async delete(id: number): Promise<Mod> {
		try {
			return await this.database.mod.delete({ where: { id } });
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при удалении мода');
		}
	}
}
