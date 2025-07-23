import { Injectable } from '@nestjs/common';
import { path } from 'app-root-path';
import { join } from 'path';
import { ensureDirSync, exists, remove } from 'fs-extra';
import { UploadedFileResponse } from './interfaces/uploaded-file-response.interface';
import * as sharp from 'sharp';
import { randomUUID } from 'crypto';

@Injectable()
export class FileService {
	private uploadsRootDir: string;
	private rootDir: string;

	constructor() {
		this.uploadsRootDir = 'uploads';
		this.rootDir = join(path, this.uploadsRootDir);
		ensureDirSync(this.rootDir);
	}

	async uploadImage(image: Express.Multer.File): Promise<UploadedFileResponse> {
		const filename = randomUUID() + '.webp';
		const pathToUploadedFile = join(this.rootDir, filename);

		await sharp(image.buffer).webp().toFile(pathToUploadedFile);
		return { filename, url: join('/', this.uploadsRootDir, filename) };
	}

	async deleteFile(filename: string): Promise<void> {
		if (filename.includes('/')) {
			return;
		}
		const pathToFile = join(this.rootDir, filename);
		const fileIsExists = await exists(pathToFile);
		if (!fileIsExists) {
			return;
		}
		await remove(pathToFile);
	}
}
