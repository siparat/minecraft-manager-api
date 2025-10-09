import {
	BadRequestException,
	ConflictException,
	HttpException,
	Injectable,
	Logger,
	NotFoundException,
	UnprocessableEntityException
} from '@nestjs/common';
import { LanguageRepository } from './repositories/language.repository';
import { AppEntity } from './entities/app.entity';
import { CreateAppDto } from './dto/create-app.dto';
import { AppsErrorMessages } from './apps.constants';
import { AppTranslationEntity } from './entities/app-translation.entity';
import { AppsRepository } from './repositories/apps.repository';
import { AppStatus, AppTranslation, IssueStatus } from 'generated/prisma';
import { UpdateAppDto } from './dto/update-app.dto';
import { AppWithTranslations } from './interfaces/app.interface';
import { AppIssueEntity } from './entities/app-issue.entity';
import { AppIssueRepository } from './repositories/app-issue.repository';
import { AppSdkEntity } from './entities/app-sdk.entity';
import { UpdateSdkDto } from './dto/update-sdk.dto';
import { AppSdkRepository } from './repositories/app-sdk.repository';
import { ModRepository } from 'src/mod/repositories/mod.repository';
import { ModErrorMessages } from 'src/mod/mod.constants';
import { ModService } from 'src/mod/mod.service';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppsService {
	constructor(
		private languageRepository: LanguageRepository,
		private appsRepository: AppsRepository,
		private appIssueRepository: AppIssueRepository,
		private appSdkRepository: AppSdkRepository,
		private modRepository: ModRepository,
		private modService: ModService,
		private config: ConfigService,
		@InjectBot() private bot: Telegraf
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

		const { translations: _, sdk, _count, ...appInfo } = app;

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

	async createIssue(appId: number, email: string, text: string): Promise<AppIssueEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		const entity = new AppIssueEntity({ appId, email, text });
		const issue = await this.appIssueRepository.createIssue(entity);
		return new AppIssueEntity(issue);
	}

	async changeIssueStatus(appId: number, issueId: number, newStatus: IssueStatus): Promise<AppIssueEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		const issue = await this.appIssueRepository.findById(issueId);
		if (!issue) {
			throw new NotFoundException(AppsErrorMessages.ISSUE_NOT_FOUND);
		}

		if (app.id !== issue.appId) {
			throw new BadRequestException(AppsErrorMessages.ISSUE_IS_NOT_HIS);
		}

		const updatedIssue = await this.appIssueRepository.changeStatus(issueId, newStatus);
		return new AppIssueEntity(updatedIssue);
	}

	async updateSdk(appId: number, dto: UpdateSdkDto): Promise<AppSdkEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		const sdkEntity = new AppSdkEntity(dto);
		const updatedSdk = await this.appSdkRepository.updateSdk(appId, sdkEntity);
		return new AppSdkEntity(updatedSdk);
	}

	async toggleViewAds(appId: number): Promise<AppSdkEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		if (!app.sdk) {
			throw new UnprocessableEntityException(AppsErrorMessages.SDK_NOT_FOUND);
		}

		const sdkEntity = new AppSdkEntity({ isAdsEnabled: !app.sdk.isAdsEnabled });
		const updatedSdk = await this.appSdkRepository.updateSdk(appId, sdkEntity);
		return new AppSdkEntity(updatedSdk);
	}

	async setNewStatus(appId: number, status: AppStatus): Promise<AppEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		const appEntity = new AppEntity({ ...app, status });
		await this.appsRepository.update(appId, appEntity);
		return appEntity;
	}

	async toggleModFromApp(appId: number, modId: number): Promise<AppEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		const mod = await this.modRepository.findById(modId);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}

		const updatedApp = await this.appsRepository.toggleModFromApp(appId, modId);
		if (!mod.translations.length) {
			try {
				await this.modService.translateDescription(modId);
			} catch (error) {
				if (error instanceof HttpException) {
					const adminId = this.config.get('ADMIN_CHAT_ID');
					await this.bot.telegram.sendMessage(adminId, `Ошибка при переводе мода ${mod.title}: ${error.message}`);
					Logger.error(error);
				}
			}
		}
		return new AppEntity(updatedApp);
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
