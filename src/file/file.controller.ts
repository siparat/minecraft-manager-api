import {
	BadRequestException,
	Body,
	Controller,
	FileTypeValidator,
	ParseFilePipe,
	Post,
	UploadedFile,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
	UsePipes
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UploadedFileResponse } from './interfaces/uploaded-file-response.interface';
import { ZodValidationPipe } from 'nestjs-zod';
import { UploadImageDto } from './dto/upload-image.dto';

@Controller('file')
export class FileController {
	constructor(private fileService: FileService) {}

	@UsePipes(ZodValidationPipe)
	@UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5242880 } }))
	@UseGuards(JwtAuthGuard)
	@Post('image')
	async uploadImage(
		@UploadedFile(ParseFilePipe)
		file: Express.Multer.File,
		@Body() { oldImageFilename }: UploadImageDto
	): Promise<UploadedFileResponse> {
		if (!file.mimetype.includes('image')) {
			throw new BadRequestException('Is not image');
		}
		const result = await this.fileService.uploadImage(file);
		if (oldImageFilename) {
			await this.fileService.deleteFile(oldImageFilename);
		}
		return result;
	}

	@UseInterceptors(FilesInterceptor('modfile', undefined, { limits: { fileSize: 52428800 } }))
	@UseGuards(JwtAuthGuard)
	@Post('modfile')
	async uploadMod(
		@UploadedFiles(new ParseFilePipe({ validators: [new FileTypeValidator({ fileType: /(zip|mc\w+)$/ })] }))
		files: Express.Multer.File[]
	): Promise<UploadedFileResponse[]> {
		const result: UploadedFileResponse[] = [];
		for (const file of files) {
			result.push(await this.fileService.saveFile(file, true));
		}
		return result;
	}
}
