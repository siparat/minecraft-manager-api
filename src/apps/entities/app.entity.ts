import { AppStatus } from 'generated/prisma';
import { IAppEntity } from '../interfaces/app-entity.interface';
import { AppTranslationEntity } from './app-translation.entity';

export class AppEntity implements IAppEntity {
	id?: number;
	order?: number;
	firebaseFile?: string;
	createdAt?: Date;
	updatedAt?: Date;
	status?: AppStatus;
	apk?: string;
	bundle?: string;
	packageName: string;
	logo: string;
	banner?: string | null;
	translations: AppTranslationEntity[];
	appScreenshots: string[];

	constructor(app: IAppEntity) {
		this.id = app.id;
		this.order = app.order || undefined;
		this.createdAt = app.createdAt;
		this.updatedAt = app.updatedAt;
		this.status = app.status;
		this.packageName = app.packageName;
		this.logo = app.logo;
		this.apk = app.apk || undefined;
		this.bundle = app.bundle || undefined;
		this.banner = app.banner || 'banner' in app ? null : undefined;
		this.firebaseFile = app.firebaseFile || undefined;
		this.translations = [];
	}

	setScreenshots(screenshots: string[]): this {
		this.appScreenshots = screenshots;
		return this;
	}

	setTranslations(translations: AppTranslationEntity[]): this {
		this.translations = translations;
		return this;
	}
}
