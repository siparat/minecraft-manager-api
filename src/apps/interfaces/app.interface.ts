import { App, AppSdk, AppTranslation, Language } from 'generated/prisma';

export interface AppWithTranslations extends App {
	translations: (Pick<AppTranslation, 'name'> & { language: Language })[];
}

export interface AppFullInfo extends AppWithTranslations {
	sdk: AppSdk | null;
	_count: Record<string, number>
}
