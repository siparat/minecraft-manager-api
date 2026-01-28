import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';
import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from 'src/s3/s3.service';
import { ParserGateway } from './parser.gateway';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileStorageService {
	private s3PublicDomain: string;

	constructor(
		private s3Service: S3Service,
		private parserGateway: ParserGateway,
		config: ConfigService
	) {
		this.s3PublicDomain = config.getOrThrow('S3_PUBLIC_DOMAIN');
	}

	async uploadFromUrl(url: string): Promise<string | null> {
		try {
			const response = await fetch(url, { redirect: 'follow' });

			if (response.status !== 200 || !response.body) {
				Logger.error('Не удалось скачать файл по ссылке');
				return null;
			}

			const ext = path.extname(new URL(url).pathname) || '.mcpack';
			const s3Key = `mods/${randomUUID()}${ext}`;

			const stream = Readable.fromWeb(response.body as any);
			const result = await this.s3Service.uploadFile(stream, s3Key);

			Logger.log({ key: result.Key }, 'Файл успешно загружен в S3');

			return this.s3PublicDomain + '/' + result.Key;
		} catch (error) {
			Logger.error({ err: error, url }, 'Ошибка при загрузке файла по URL');
			return null;
		}
	}

	async uploadFromPlaywright(url: string): Promise<string | null> {
		Logger.log({ url }, 'Начало скачивания файла через Playwright');
		const downloadResult = await this.parserGateway.downloadFile(url);
		if (!downloadResult) {
			Logger.error({ url }, 'Не удалось скачать файл через Playwright');
			return null;
		}

		try {
			const ext = path.extname(downloadResult.filename) || '.mcpack';
			const s3Key = `mods/${randomUUID()}${ext}`;

			const stats = await fs.promises.stat(downloadResult.savePath);
			Logger.log({ url, s3Key, size: stats.size }, 'Файл скачан (Playwright), начало загрузки в S3');

			const fileStream = fs.createReadStream(downloadResult.savePath);
			const result = await this.s3Service.uploadFile(fileStream, s3Key);

			await fs.promises.unlink(downloadResult.savePath).catch(() => {});

			Logger.log({ key: result.Key }, 'Файл успешно загружен в S3 (Playwright)');

			return this.s3PublicDomain + '/' + result.Key;
		} catch (error) {
			Logger.error({ err: error, url }, 'Ошибка при загрузке файла через Playwright');
			return null;
		}
	}
}
