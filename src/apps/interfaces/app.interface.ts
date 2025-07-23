import { App, AppTranslation, Language } from 'generated/prisma';

export interface AppWithTranslations extends App {
	translations: (Pick<AppTranslation, 'name'> & { language: Language })[];
}
