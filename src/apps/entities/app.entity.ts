import { AppStatus } from 'generated/prisma';
import { IAppEntity } from '../interfaces/app-entity.interface';
import { AppTranslationEntity } from './app-translation.entity';

export class AppEntity implements IAppEntity {
	id?: number;
	createdAt?: Date;
	updatedAt?: Date;
	status?: AppStatus;
	packageName: string;
	logo: string;
	banner: string;
	translations: AppTranslationEntity[];

	constructor(app: IAppEntity) {
		Object.assign(this, app);
		this.translations = [];
	}

	setTranslations(translations: AppTranslationEntity[]): this {
		this.translations = translations;
		return this;
	}
}
