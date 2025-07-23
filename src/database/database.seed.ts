import { Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

const startSeed = async (): Promise<void> => {
	const client = new PrismaClient();

	try {
		await client.$connect();
		const languagesCounts = await client.language.count();
		if (languagesCounts !== 0) {
			return;
		}

		await client.language.createMany({
			data: [
				{ code: 'ru', nameRu: 'Русский', nameOriginal: 'Русский' },
				{ code: 'en', nameRu: 'Английский (США)', nameOriginal: 'English (US)' },
				{ code: 'ar', nameRu: 'Арабский', nameOriginal: 'العربية' },
				{ code: 'es', nameRu: 'Испанский', nameOriginal: 'Español' },
				{ code: 'ko', nameRu: 'Корейский', nameOriginal: '한국어' },
				{ code: 'de', nameRu: 'Немецкий', nameOriginal: 'Deutsch' },
				{ code: 'pt', nameRu: 'Португальский (Бразилия)', nameOriginal: 'Português (Brasil)' },
				{ code: 'fr', nameRu: 'Французский (Франция)', nameOriginal: 'Français (France)' },
				{ code: 'hi', nameRu: 'Хинди', nameOriginal: 'हिन्दी' },
				{ code: 'ja', nameRu: 'Японский', nameOriginal: '日本語' },
				{ code: 'it', nameRu: 'Итальянский', nameOriginal: 'Italiano' },
				{ code: 'id', nameRu: 'Индонезийский', nameOriginal: 'Bahasa Indonesia' }
			]
		});
	} catch (error) {
		Logger.error(error);
	} finally {
		await client.$disconnect();
	}
};

startSeed();
