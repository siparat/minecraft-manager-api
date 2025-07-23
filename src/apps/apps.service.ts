import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LanguageRepository } from './repositories/language.repository';
import { AppEntity } from './entities/app.entity';
import { CreateAppDto } from './dto/create-app.dto';
import { AppsErrorMessages } from './apps.constants';
import { AppTranslationEntity } from './entities/app-translation.entity';
import { AppsRepository } from './repositories/apps.repository';
import { AppTranslation } from 'generated/prisma';
import { UpdateAppDto } from './dto/update-app.dto';
import { AppWithTranslations } from './interfaces/app.interface';

@Injectable()
export class AppsService {
	constructor(
		private languageRepository: LanguageRepository,
		private appsRepository: AppsRepository
	) {}

	async createApp({ translations, ...otherDto }: CreateAppDto): Promise<AppEntity> {
		const translationsIsValid = await this.validateTranslations(translations);
		if (!translationsIsValid) {
			throw new BadRequestException(AppsErrorMessages.MISSING_TRANSLATIONS);
		}

		const existedApp = await this.appsRepository.findByPackageName(otherDto.packageName);
		if (existedApp) {
			throw new ConflictException(AppsErrorMessages.APP_ALREADY_EXISTS);
		}

		const translationEntities = translations.map((t) => new AppTranslationEntity(t));
		const appEntity = new AppEntity(otherDto).setTranslations(translationEntities);
		const app = await this.appsRepository.create(appEntity);
		return new AppEntity(app).setTranslations(translationEntities);
	}

	async updateApp(appId: number, { translations, ...otherDto }: UpdateAppDto): Promise<AppEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		if (otherDto.packageName) {
			const existedApp = await this.appsRepository.findByPackageName(otherDto.packageName);
			if (existedApp && appId !== existedApp.id) {
				throw new ConflictException(AppsErrorMessages.APP_ALREADY_EXISTS);
			}
		}

		if (translations) {
			await this.updateTranslationsToApp(app, translations);
		}

		const { translations: _, ...appInfo } = app;

		const appEntity = new AppEntity({ ...appInfo, ...otherDto });
		const updatedApp = await this.appsRepository.update(app.id, appEntity);
		const translationEntities = updatedApp.translations.map(
			(t) => new AppTranslationEntity({ name: t.name, languageId: t.language.id })
		);
		return new AppEntity(updatedApp).setTranslations(translationEntities);
	}

	async updateTranslationsToApp(
		app: AppWithTranslations,
		translations: Pick<AppTranslation, 'languageId' | 'name'>[]
	): Promise<AppTranslation[]> {
		for (const translation of app.translations) {
			if (translations.some((t) => t.languageId == translation.language.id)) {
				continue;
			}
			translations.push({ languageId: translation.language.id, name: translation.name });
		}
		const translationsEntities = translations.map((t) => new AppTranslationEntity({ ...t, appId: app.id }));
		return this.appsRepository.createTranslationsToApp(app.id, translationsEntities);
	}

	async deleteApp(appId: number): Promise<void> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		await this.appsRepository.deleteById(appId);
	}

	private async validateTranslations(translations: Pick<AppTranslation, 'languageId' | 'name'>[]): Promise<boolean> {
		const languages = await this.languageRepository.getAllLanguages();
		const missingTranslations = languages.filter((l) => !translations.some((t) => t.languageId == l.id));
		if (missingTranslations.length !== 0 || translations.length !== languages.length) {
			return false;
		}
		return true;
	}
}
