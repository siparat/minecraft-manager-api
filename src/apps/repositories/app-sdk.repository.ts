import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { AppSdkEntity } from '../entities/app-sdk.entity';
import { AppSdk } from 'generated/prisma';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AppSdkRepository {
	constructor(private database: DatabaseService) {}

	async updateSdk(appId: number, appSdkEntity: AppSdkEntity): Promise<AppSdk> {
		try {
			return await this.database.appSdk.update({ where: { appId }, data: appSdkEntity });
		} catch (error) {
			Logger.error(error);
			throw new InternalServerErrorException('Произошла непредвиденная ошибка при изменении sdk');
		}
	}
}
