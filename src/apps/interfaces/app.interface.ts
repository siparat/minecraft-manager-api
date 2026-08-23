import { App, AppAd, AppSdk, AppTranslation, Language } from 'generated/prisma';

export const AppModStatus = ['actived', 'inactived'] as const;

export interface AppWithTranslations extends App {
	translations: (Pick<AppTranslation, 'name'> & { language: Language })[];
}

export interface AppFullInfo extends AppWithTranslations {
	sdk: AppSdk | null;
	ads: AppAd[];
	_count: Record<string, number>;
}
