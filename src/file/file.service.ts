import { Injectable } from '@nestjs/common';
import { path } from 'app-root-path';
import { join } from 'path';
import { ensureDirSync, exists, remove, writeFile } from 'fs-extra';
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
		const filename = randomUUID() + '.png';
		const pathToUploadedFile = join(this.rootDir, filename);

		await sharp(image.buffer).png({ quality: 80 }).toFile(pathToUploadedFile);
		return { filename, url: join('/', this.uploadsRootDir, filename) };
	}

	async saveFile(file: Express.Multer.File, setOriginalName?: boolean): Promise<UploadedFileResponse> {
		const ext = '.' + file.originalname.split('.').pop();
		const filename = setOriginalName ? file.originalname : randomUUID() + ext;
		const pathToUploadedFile = join(this.rootDir, filename);

		await writeFile(pathToUploadedFile, file.buffer);
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
