import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Language, Mod, ModVersion, Prisma } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { ModEntity } from '../entities/mod.entity';
import { ModWithVersions } from '../interfaces/mod.interface';
import { ModSearchResponse } from '../interfaces/mod-search-response.interface';
import { ModSort } from '../interfaces/mod-sort.interface';
import { ModSorts } from '../mod.constants';
import { ModTranslationEntity } from '../entities/mod-translation.entity';
import { FilterItem } from 'src/common/types/filter-operations';
import { ModCategory } from 'minecraft-manager-schemas';

@Injectable()
export class ModRepository {
	constructor(private database: DatabaseService) {}

	async search(
		take: number,
		skip: number,
		q?: string,
		versions?: string[],
		category?: ModCategory,
		ratingFilter?: FilterItem<number>,
		commentsCountFilter?: FilterItem<number>,
		sort?: ModSort
	): Promise<ModSearchResponse> {
		const where = {
			category,
			versions: versions ? { some: { version: { in: versions } } } : undefined,
			title: { contains: q, mode: Prisma.QueryMode.insensitive },
			commentCounts: commentsCountFilter ? { [commentsCountFilter.operator]: commentsCountFilter.value } : undefined,
			rating: ratingFilter ? { [ratingFilter.operator]: ratingFilter.value } : undefined
		};
		const mods = await this.database.mod.findMany({
			where,
			take,
			skip,
			include: { versions: true, _count: { select: { apps: true } } },
			orderBy: sort ? ModSorts[sort.key](sort.value) : { createdAt: 'desc' }
		});
		const count = await this.database.mod.count({ where });
		return { count, mods };
	}

	async searchModsFromApp(
		appId: number,
		isActive: boolean,
		take: number,
		skip: number,
		language?: string,
		q?: string,
		versions?: string[],
		category?: ModCategory,
		ratingFilter?: FilterItem<number>,
		commentsCountFilter?: FilterItem<number>,
		sort?: ModSort
	): Promise<ModSearchResponse> {
		const where = {
			appId: isActive ? appId : { not: appId },
			mod: {
				category,
				versions: versions ? { some: { version: { in: versions } } } : undefined,
				title: { contains: q, mode: Prisma.QueryMode.insensitive },
				commentCounts: commentsCountFilter ? { [commentsCountFilter.operator]: commentsCountFilter.value } : undefined,
				rating: ratingFilter ? { [ratingFilter.operator]: ratingFilter.value } : undefined
			}
		};

		const mods = (
			await this.database.appMod.findMany({
				where,
				take,
				skip,
				select: {
					mod: {
						include: {
							translations: language ? { where: { language: { code: language } } } : true,
							versions: true,
							_count: { select: { apps: true } },
							apps: { select: { appId: true }, where: { appId } }
						}
					}
				},
				orderBy: sort ? ModSorts[sort.key](sort.value) : undefined
			})
		).map(({ mod }) => mod);
		const count = await this.database.appMod.count({ where });
		return { count, mods: mods.map((m) => ({ ...m, apps: m.apps.map(({ appId }) => ({ id: appId })) })) };
	}

	count(): Promise<number> {
		return this.database.mod.count();
	}

	getAllVersions(): Promise<ModVersion[]> {
		return this.database.modVersion.findMany();
	}

	getAllLanguages(): Promise<Language[]> {
		return this.database.language.findMany();
	}

	async getUsedModsId(): Promise<
		{
			id: number;
			mods: {
				mod: {
					parsedSlug: string | null;
					title: string;
				};
			}[];
			packageName: string;
		}[]
	> {
		return await this.database.app.findMany({
			select: {
				id: true,
				packageName: true,
				mods: {
					where: { mod: { isParsed: true, parsedSlug: { not: null } } },
					select: { mod: { select: { parsedSlug: true, title: true } } }
				}
			}
		});
	}

	async saveTranslations(translations: ModTranslationEntity[]): Promise<void> {
		try {
			await this.database.modTranslation.createMany({ data: translations });
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при создании перевода мода');
		}
	}

	async getModSlugs(): Promise<(string | null)[]> {
		const mods = await this.database.mod.findMany({ where: { isParsed: true }, select: { parsedSlug: true } });
		return mods.map(({ parsedSlug }) => parsedSlug);
	}

	async create({ translations, ...modEntity }: ModEntity): Promise<Mod> {
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
				},
				include: { versions: true, _count: { select: { apps: true } } }
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при создании мода');
		}
	}

	async update(id: number, { translations, ...modEntity }: ModEntity): Promise<Mod> {
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
				},
				include: { versions: true, _count: { select: { apps: true } } }
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при редактировании мода');
		}
	}

	async findById(id: number): Promise<ModWithVersions | null> {
		return this.database.mod.findUnique({
			where: { id },
			include: { versions: true, translations: true, _count: { select: { apps: true } } }
		});
	}

	async findBySlug(slug: string): Promise<Mod | null> {
		return this.database.mod.findUnique({
			where: { parsedSlug: slug },
			include: { versions: true, translations: true, _count: { select: { apps: true } } }
		});
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
