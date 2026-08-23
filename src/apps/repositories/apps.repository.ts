import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
<<<<<<< HEAD
import { App, AppTranslation, Mod } from 'generated/prisma';
=======
import { App, AppAd, AppMod, AppTranslation, Mod, ModTranslation, ModVersion } from 'generated/prisma';
>>>>>>> 4d29bee (feat: add ads app module)
import { DatabaseService } from 'src/database/database.service';
import { AppEntity } from '../entities/app.entity';
import { AppFullInfo, AppWithTranslations } from '../interfaces/app.interface';
import { AppTranslationEntity } from '../entities/app-translation.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppsRepository {
	constructor(
		private database: DatabaseService,
		private config: ConfigService
	) {}

	async create(appEntity: AppEntity): Promise<App> {
		const token = this.config.get('DEFAULT_APP_LOVIN_TOKEN');
		try {
			return await this.database.app.create({
				data: {
					...appEntity,
					translations: { createMany: { data: appEntity.translations } },
					sdk: {
						create: {
							appLovinToken: token || undefined
						}
					}
				}
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при создании приложения');
		}
	}

	async setOrder(order: number[]): Promise<void> {
		try {
			for (const index in order) {
				await this.database.app.update({ where: { id: order[index] }, data: { order: Number(index) } });
			}
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при установке порядка приложений');
		}
	}

	async setModsOrder(appId: number, order: number[]): Promise<void> {
		try {
			for (const index in order) {
				await this.database.appMod.updateMany({
					where: { appId, modId: order[index] },
					data: { order: Number(index) }
				});
			}
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException(
				'Произошла непредвиденная ошибка при установке порядка модов в приложении'
			);
		}
	}

	getAll(lanugageCode?: string): Promise<AppWithTranslations[]> {
		return this.database.app.findMany({
			include: {
				sdk: {
					select: { isAdsEnabled: true, isInterAdsEnabled: true, isNativeAdsEnabled: true, isOpenAdsEnabled: true }
				},
				translations: {
					where: lanugageCode ? { language: { code: lanugageCode } } : undefined,
					select: { name: true, language: true },
					take: 1
				},
				_count: { select: { mods: true } }
			},
			orderBy: { order: 'asc' }
		});
	}

	findByPackageName(name: string): Promise<AppWithTranslations | null> {
		return this.database.app.findUnique({
			where: { packageName: name },
			include: { translations: { select: { name: true, language: true } }, _count: { select: { mods: true } } }
		});
	}

	findById(id: number): Promise<AppFullInfo | null> {
		return this.database.app.findUnique({
			where: { id },
			include: {
				sdk: true,
				translations: { select: { name: true, language: true } },
				_count: { select: { mods: true } }
			}
		});
	}

	async toggleModFromApp(appId: number, modId: number): Promise<App> {
		try {
			const modIsConnected =
				(await this.database.mod.findFirst({ where: { id: modId, apps: { some: { appId } } } })) !== null;
			return this.database.app.update({
				where: { id: appId },
				include: { _count: { select: { mods: true } } },
				data: {
					mods: modIsConnected ? { deleteMany: { modId, appId } } : { create: { modId } }
				}
			});
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при добавлении мода в приложение');
		}
	}

	async update(appId: number, { translations: _, ...appEntity }: AppEntity): Promise<AppWithTranslations> {
		try {
			return await this.database.app.update({
				where: { id: appId },
				data: appEntity,
				include: { translations: { select: { name: true, language: true } }, _count: { select: { mods: true } } }
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

	async getRandomModFromApp(appId: number): Promise<Mod | null> {
		const modCounts = await this.database.mod.count({
			where: { apps: { some: { appId } } }
		});

		if (modCounts === 0) {
			return null;
		}

		const skip = Math.floor(Math.random() * modCounts);

		return this.database.mod.findFirst({
			where: { apps: { some: { appId } } },
			orderBy: { id: 'asc' },
			skip
		});
	}

	async getTopModsFromApp(
		appId: number,
		language?: string
	): Promise<
		(Omit<Mod, 'htmlDescription'> & {
			versions: ModVersion[];
			translations: ModTranslation[];
			_count: { apps: number; reactions: number };
		})[]
	> {
		const appMods = await this.database.appMod.findMany({
			where: { appId },
			take: 5,
			orderBy: { order: 'asc' },
			select: {
				mod: {
					omit: { htmlDescription: true },
					include: {
						versions: true,
						translations: language ? { where: { language: { code: language } } } : true,
						_count: { select: { apps: true, reactions: true } }
					}
				}
			}
		});

		return appMods.map(({ mod }) => mod);
	}

	async getNewModsFromApp(
		appId: number,
		take: number,
		language?: string
	): Promise<
		(Omit<Mod, 'htmlDescription'> & {
			versions: ModVersion[];
			translations: ModTranslation[];
			_count: { apps: number; reactions: number };
		})[]
	> {
		const appMods = await this.database.appMod.findMany({
			where: { appId },
			take,
			orderBy: { createdAt: 'desc' },
			select: {
				mod: {
					omit: { htmlDescription: true },
					include: {
						versions: true,
						translations: language ? { where: { language: { code: language } } } : true,
						_count: { select: { apps: true, reactions: true } }
					}
				}
			}
		});

		return appMods.map(({ mod }) => mod);
	}

	getAds(appId: number): Promise<AppAd[]> {
		return this.database.appAd.findMany({ where: { appId }, orderBy: { id: 'asc' } });
	}

	getAd(appId: number, adId: string): Promise<AppAd | null> {
		return this.database.appAd.findUnique({ where: { appId_adId: { appId, adId } } });
	}

	createAd(appId: number, data: Pick<AppAd, 'adId' | 'label' | 'isEnabled'>): Promise<AppAd> {
		return this.database.appAd.create({ data: { ...data, appId } });
	}

	updateAd(appId: number, adId: string, data: Partial<Pick<AppAd, 'label' | 'isEnabled'>>): Promise<AppAd> {
		return this.database.appAd.update({ where: { appId_adId: { appId, adId } }, data });
	}

	deleteAd(appId: number, adId: string): Promise<AppAd> {
		return this.database.appAd.delete({ where: { appId_adId: { appId, adId } } });
	}

	createAds(appId: number, ads: Pick<AppAd, 'adId' | 'label' | 'isEnabled'>[]): Promise<{ count: number }> {
		return this.database.appAd.createMany({ data: ads.map((ad) => ({ ...ad, appId })) });
	}
}
