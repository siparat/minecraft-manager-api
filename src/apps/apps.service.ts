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
import { AppAd, AppStatus, AppTranslation, IssueStatus } from 'generated/prisma';
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
import { RecommendModDto } from './dto/recommend-mod.dto';
import { ParserService } from 'src/parser/parser.service';
import { AppAdDto } from './dto/app-ad.dto';

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
		private parserService: ParserService,
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

		const adminId = this.config.get('ADMIN_CHAT_ID');
		const hostApp = this.config.get('HOST_APP');
		const topicId = this.config.get('ISSUES_TOPIC_ID');

		if (adminId && hostApp) {
			const urlToIssue = hostApp + `/app/${appId}/issues`;
			const message = `🚨 <b>Новая жалоба от пользователя</b>

👤 Почта: <a href="mailto:${email}">${email}</a>
📱 Приложение: <a href="${urlToIssue}">${app.translations[0].name} (${app.packageName})</a>

<b>💬 Сообщение пользователя:</b>
<blockquote>${text}</blockquote>`;

			try {
				await this.bot.telegram.sendMessage(adminId, message, { parse_mode: 'HTML', message_thread_id: topicId });
			} catch (error) {
				Logger.error(error);
			}
		}

		return new AppIssueEntity(issue);
	}

	async recommendMod(appId: number, dto: RecommendModDto): Promise<void> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		const adminId = this.config.get('ADMIN_CHAT_ID');
		const topicId = this.config.get('RECOMMENDATIONS_TOPIC_ID');
		const message = `
🧩 <b>Новое предложение мода</b>

📱 <b>Приложение:</b> ${app.translations[0].name} (${app.packageName})
👤 <b>Почта пользователя:</b> <a href="mailto:${dto.email}">${dto.email}</a>

📝 <b>Описание мода:</b>
<blockquote>${dto.description}</blockquote>`;

		try {
			await this.bot.telegram.sendMessage(adminId, message, { parse_mode: 'HTML', message_thread_id: topicId });
		} catch (error) {
			Logger.error(error);
		}
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

	async toggleViewAds(appId: number, type?: 'open' | 'inter' | 'native'): Promise<AppSdkEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		if (!app.sdk) {
			throw new UnprocessableEntityException(AppsErrorMessages.SDK_NOT_FOUND);
		}

		const sdkEntity = new AppSdkEntity({});
		switch (type) {
			case 'open':
				sdkEntity.isOpenAdsEnabled = !app.sdk.isOpenAdsEnabled;
				break;
			case 'inter':
				sdkEntity.isInterAdsEnabled = !app.sdk.isInterAdsEnabled;
				break;
			case 'native':
				sdkEntity.isNativeAdsEnabled = !app.sdk.isNativeAdsEnabled;
				break;
			default:
				sdkEntity.isAdsEnabled = !app.sdk.isAdsEnabled;
				break;
		}

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

		this.parserService
			.saveModfilesToS3(mod)
			.then((newFiles) => {
				if (newFiles) {
					return this.modRepository.updateFiles(mod.id, newFiles);
				}
			})
			.catch((e) => Logger.error(e));

		const updatedApp = await this.appsRepository.toggleModFromApp(appId, modId);
		if (!mod.translations.length) {
			try {
				await this.modService.translateDescription(modId);
			} catch (error) {
				if (error instanceof HttpException) {
					const adminId = this.config.get('ADMIN_CHAT_ID');
					const topicId = this.config.get('ERRORS_TOPIC_ID');
					await this.bot.telegram.sendMessage(adminId, `Ошибка при переводе мода ${mod.title}: ${error.message}`, {
						message_thread_id: topicId
					});
					Logger.error(error);
				}
			}
		}
		return new AppEntity(updatedApp);
	}

	async getAds(appId: number): Promise<AppAdDto[]> {
		await this.assertAppExists(appId);
		return this.appsRepository.getAds(appId);
	}

	async getAd(appId: number, adId: string): Promise<Pick<AppAdDto, 'label' | 'isEnabled'>> {
		const ad = await this.appsRepository.getAd(appId, adId);
		if (!ad) {
			throw new NotFoundException(AppsErrorMessages.AD_NOT_FOUND);
		}
		return { label: ad.label, isEnabled: ad.isEnabled };
	}

	async createAd(appId: number, dto: AppAd): Promise<AppAdDto> {
		await this.assertAppExists(appId);
		const normalizeAddDto = this.normalizeAd(dto);
		this.validateAd(normalizeAddDto);
		if (await this.appsRepository.getAd(appId, normalizeAddDto.adId)) {
			throw new ConflictException(AppsErrorMessages.AD_ALREADY_EXISTS);
		}
		return this.appsRepository.createAd(appId, normalizeAddDto);
	}

	async updateAd(appId: number, adId: string, dto: Partial<Pick<AppAdDto, 'label' | 'isEnabled'>>): Promise<AppAdDto> {
		await this.assertAdExists(appId, adId);
		if (dto.label !== undefined) {
			dto.label = dto.label.trim();
		}
		if (dto.label !== undefined && !dto.label) {
			throw new BadRequestException(AppsErrorMessages.AD_BAD_PAYLOAD);
		}
		return this.appsRepository.updateAd(appId, adId, dto);
	}

	async deleteAd(appId: number, adId: string): Promise<void> {
		await this.assertAdExists(appId, adId);
		await this.appsRepository.deleteAd(appId, adId);
	}

	async importAds(appId: number, ads: AppAd[]): Promise<{ count: number }> {
		await this.assertAppExists(appId);
		const normalizeAddDto = Array.isArray(ads) ? ads.map((ad) => this.normalizeAd(ad)) : ads;
		if (!Array.isArray(normalizeAddDto) || normalizeAddDto.some((ad) => !this.adIsValid(ad))) {
			throw new BadRequestException(AppsErrorMessages.AD_BAD_PAYLOAD);
		}
		const ids = normalizeAddDto.map(({ adId }) => adId);
		if (
			new Set(ids).size !== ids.length ||
			(await this.appsRepository.getAds(appId)).some((ad) => ids.includes(ad.adId))
		) {
			throw new ConflictException(AppsErrorMessages.AD_IMPORT_COLLISION);
		}
		return this.appsRepository.createAds(appId, normalizeAddDto);
	}

	private async validateTranslations(translations: Pick<AppTranslation, 'languageId' | 'name'>[]): Promise<boolean> {
		const languages = await this.languageRepository.getAllLanguages();
		const missingTranslations = languages.filter((l) => !translations.some((t) => t.languageId == l.id));
		if (missingTranslations.length !== 0 || translations.length !== languages.length) {
			return false;
		}
		return true;
	}

	private async assertAppExists(appId: number): Promise<void> {
		if (!(await this.appsRepository.findById(appId))) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}
	}

	private async assertAdExists(appId: number, adId: string): Promise<void> {
		await this.assertAppExists(appId);
		if (!(await this.appsRepository.getAd(appId, adId))) {
			throw new NotFoundException(AppsErrorMessages.AD_NOT_FOUND);
		}
	}

	private validateAd(ad: AppAdDto): void {
		if (!this.adIsValid(ad)) {
			throw new BadRequestException(AppsErrorMessages.AD_BAD_PAYLOAD);
		}
	}

	private adIsValid(ad: AppAdDto): boolean {
		return !!ad?.adId?.trim() && !!ad?.label?.trim() && typeof ad.isEnabled === 'boolean';
	}

	private normalizeAd({ id, createdAt, updatedAt, ...ad }: AppAd): AppAdDto {
		return { ...ad, adId: ad?.adId?.trim(), label: ad?.label?.trim() };
	}
}
