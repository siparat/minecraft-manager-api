import { IAppTranslationEntity } from '../interfaces/app-translation-entity.interface';

export class AppTranslationEntity implements IAppTranslationEntity {
	id?: number;
	name: string;
	appId: number;
	languageId: number;

	constructor(translation: IAppTranslationEntity) {
		Object.assign(this, translation);
	}
}
