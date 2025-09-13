import { Injectable, NotFoundException } from '@nestjs/common';
import { ModEntity } from './entities/mod.entity';
import { CreateModDto } from './dto/create-mod.dto';
import { ModRepository } from './repositories/mod.repository';
import { UpdateModDto } from './dto/update-mod.dto';
import { ModErrorMessages } from './mod.constants';
import { ModTranslationEntity } from './entities/mod-translation.entity';
import { DeeplGateway } from 'src/integrations/deepl/deepl.gateway';

@Injectable()
export class ModService {
	constructor(
		private modRepository: ModRepository,
		private deeplGateway: DeeplGateway
	) {}

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

		const modEntity = new ModEntity({ ...mod, ...dto }).setVersions(
			dto.versions ? dto.versions.map((version) => ({ version })) : mod.versions
		);

		const updatedMod = await this.modRepository.update(id, modEntity);
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

		const languages = await this.modRepository.getAllLanguages();

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
}
