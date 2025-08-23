import { FileValidator } from '@nestjs/common';

export class AndroidBundleValidator extends FileValidator {
	constructor() {
		super({});
	}

	isValid(file?: Express.Multer.File): boolean {
		return !!file && /\.aab$/i.test(file.originalname);
	}

	buildErrorMessage(): string {
		return 'Файл должен иметь расширение .aab';
	}
}
