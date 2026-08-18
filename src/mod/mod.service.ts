import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModEntity } from './entities/mod.entity';
import { CreateModDto } from './dto/create-mod.dto';
import { ModRepository } from './repositories/mod.repository';
import { UpdateModDto } from './dto/update-mod.dto';
import { ModErrorMessages } from './mod.constants';
import { ModTranslationEntity } from './entities/mod-translation.entity';
import { DeeplGateway } from 'src/integrations/deepl/deepl.gateway';
import { ConfigService } from '@nestjs/config';
import { Mod, ModReactionType } from 'generated/prisma';
import { ParserService } from 'src/parser/parser.service';

@Injectable()
export class ModService {
	constructor(
		private modRepository: ModRepository,
		private deeplGateway: DeeplGateway,
		private parser: ParserService,
		private config: ConfigService
	) {}

	async findById(id: number, languageCode?: string, appId?: number): Promise<ModEntity> {
		const mod = await this.modRepository.findById(id, languageCode);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}
		const similarMods = appId ? await this.modRepository.getRandomSimilarMods(appId, id, languageCode) : [];
		const trendingPosition = appId ? await this.modRepository.getTrendingPosition(appId, id) : null;
		const similarModEntities = similarMods.map((mod) => {
			const description = mod.translations[0]?.description;
			const entity = new ModEntity({ ...mod, description: description || mod.description, reactionsCount: mod._count.reactions });
			entity.translations = [];
			return entity.setVersions(mod.versions);
		});
		const findedModEntity = new ModEntity({ ...mod, reactionsCount: mod._count.reactions, trendingPosition })
			.setVersions(mod.versions)
			.setTranslations(mod.translations)
			.setSimilarMods(similarModEntities);
		if (!mod.parsedSlug || !mod.files[0]?.startsWith('https://api.mcpedl.com')) {
			return findedModEntity;
		}

		try {
			const newLinks = await this.parser.getRelevantLinks(mod.parsedSlug);
			if (!newLinks || !newLinks.length) {
				return findedModEntity;
			}

			const entity = new ModEntity({
				...mod,
				files: newLinks.map(({ file }) => file),
				reactionsCount: mod._count.reactions,
				trendingPosition
			}).setTranslations(mod.translations);
			this.modRepository.update(mod.id, entity);
			return entity.setVersions(mod.versions).setTranslations(mod.translations).setSimilarMods(similarModEntities);
		} catch (error) {
			Logger.error(error);
			return findedModEntity;
		}
	}

	async getReactions(
		modId: number,
		clientUserId?: string
	): Promise<{ selected: ModReactionType | null; counts: Record<ModReactionType, number>; total: number }> {
		const mod = await this.modRepository.findById(modId);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}
		const summary = await this.modRepository.getReactionSummary(modId, clientUserId);
		const counts = Object.values(ModReactionType).reduce(
			(acc, type) => {
				acc[type] = summary.counts.find((item) => item.type === type)?.count ?? 0;
				return acc;
			},
			{} as Record<ModReactionType, number>
		);
		return { selected: summary.selected, counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) };
	}

	async setReaction(
		modId: number,
		clientUserId: string | undefined,
		reaction: ModReactionType | null | undefined
	): Promise<void> {
		if (!clientUserId) {
			throw new BadRequestException(ModErrorMessages.CLIENT_USER_ID_REQUIRED);
		}
		if (reaction === undefined) {
			throw new BadRequestException(ModErrorMessages.REACTION_REQUIRED);
		}
		if (reaction !== null && !Object.values(ModReactionType).includes(reaction)) {
			throw new BadRequestException(ModErrorMessages.UNKNOWN_REACTION);
		}
		const mod = await this.modRepository.findById(modId);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}
		await this.modRepository.setReaction(modId, clientUserId, reaction);
	}

	async getDownloads(modId: number): Promise<{
		total: number;
		apps: { appId: number; packageName: string; name: string; downloadsCount: number }[];
	}> {
		const mod = await this.modRepository.findById(modId);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}
		return this.modRepository.getDownloads(modId);
	}

	async create(dto: CreateModDto, isParsed: boolean = false): Promise<ModEntity> {
		const modEntity = new ModEntity({ ...dto, isParsed }).setVersions(dto.versions.map((version) => ({ version })));
		const mod = await this.modRepository.create(modEntity);
		return new ModEntity(mod).setVersions(modEntity.versions);
	}

	async update(id: number, dto: UpdateModDto): Promise<ModEntity> {
		const mod = await this.modRepository.findById(id);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}
		const descriptionChanged = dto.description !== undefined && dto.description !== mod.description;

		const modEntity = new ModEntity({ ...mod, ...dto }).setVersions(
			dto.versions ? dto.versions.map((version) => ({ version })) : mod.versions
		);

		const updatedMod = await this.modRepository.update(id, modEntity);
		if (descriptionChanged && mod.translations.length) {
			await this.translateDescription(id);
		}
		return new ModEntity(updatedMod).setVersions(modEntity.versions);
	}

	async delete(id: number): Promise<void> {
		const mod = await this.modRepository.findById(id);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}

		await this.modRepository.delete(id);
	}

	async translateDescription(modId: number): Promise<void> {
		const mod = await this.modRepository.findById(modId);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}

		const languages = (await this.modRepository.getAllLanguages()).filter(({ code }) => ['en', 'ru'].includes(code));

		const translations: ModTranslationEntity[] = [];
		for (const language of languages) {
			const languageId = language.id;
			if (language.code == 'en') {
				translations.push(new ModTranslationEntity({ modId, languageId, description: mod.description }));
				continue;
			}
			const response = await this.deeplGateway.translate(language.code, mod.description);
			const description = response.translations[0].text;
			translations.push(new ModTranslationEntity({ modId, languageId, description }));
		}
		await this.modRepository.saveTranslations(translations);
	}

	async searchDeprecatedMods(): Promise<(Pick<Mod, 'parsedSlug' | 'title'> & { url: string; packageName: string })[]> {
		const apps = await this.modRepository.getUsedModsId();
		const host = this.config.get('HOST_MODS_API');

		const result: (Pick<Mod, 'parsedSlug' | 'title'> & { url: string; packageName: string })[] = [];

		for (const app of apps) {
			for (const { mod } of app.mods) {
				if (!mod.parsedSlug) continue;

				const url = new URL(mod.parsedSlug, host);
				const response = await fetch(url);
				if (new URL(response.url).pathname === '/notfound/') {
					result.push({
						parsedSlug: mod.parsedSlug,
						url: url.toString(),
						title: mod.title,
						packageName: app.packageName
					});
				}
			}
		}

		return result;
	}
}
