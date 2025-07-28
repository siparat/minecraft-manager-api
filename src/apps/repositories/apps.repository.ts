import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { App, AppTranslation } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';
import { AppEntity } from '../entities/app.entity';
import { AppFullInfo, AppWithTranslations } from '../interfaces/app.interface';
import { AppTranslationEntity } from '../entities/app-translation.entity';

@Injectable()
export class AppsRepository {
	constructor(private database: DatabaseService) {}

	async create(appEntity: AppEntity): Promise<App> {
		try {
			return await this.database.app.create({
				data: { ...appEntity, translations: { createMany: { data: appEntity.translations } }, sdk: { create: {} } }
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при создании приложения');
		}
	}

	getAll(): Promise<AppWithTranslations[]> {
		return this.database.app.findMany({
			include: { translations: { select: { name: true, language: true } } }
		});
	}

	findByPackageName(name: string): Promise<AppWithTranslations | null> {
		return this.database.app.findUnique({
			where: { packageName: name },
			include: { translations: { select: { name: true, language: true } } }
		});
	}

	findById(id: number): Promise<AppFullInfo | null> {
		return this.database.app.findUnique({
			where: { id },
			include: { sdk: true, translations: { select: { name: true, language: true } } }
		});
	}

	async update(appId: number, { translations: _, ...appEntity }: AppEntity): Promise<AppWithTranslations> {
		try {
			return await this.database.app.update({
				where: { id: appId },
				data: appEntity,
				include: { translations: { select: { name: true, language: true } } }
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при редактировании приложения');
		}
	}

	async deleteTranslationsFromApp(appId: number): Promise<number> {
		try {
			return (await this.database.appTranslation.deleteMany({ where: { appId } })).count;
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при удалении переводов');
		}
	}

	async createTranslationsToApp(appId: number, translations: AppTranslationEntity[]): Promise<AppTranslation[]> {
		try {
			const result = await this.database.$transaction([
				this.database.appTranslation.deleteMany({ where: { appId } }),
				this.database.appTranslation.createManyAndReturn({
					data: translations
				})
			]);
			return result[1];
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при создании переводов');
		}
	}

	async deleteById(id: number): Promise<App> {
		try {
			return await this.database.app.delete({ where: { id } });
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при удалении приложения');
		}
	}
}
