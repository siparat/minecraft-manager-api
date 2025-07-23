import {
	Body,
	Controller,
	FileTypeValidator,
	ParseFilePipe,
	Post,
	UploadedFile,
	UseGuards,
	UseInterceptors,
	UsePipes
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from 'generated/prisma';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/user/guards/role.guard';
import { UploadedFileResponse } from './interfaces/uploaded-file-response.interface';
import { ZodValidationPipe } from 'nestjs-zod';
import { UploadImageDto } from './dto/upload-image.dto';

@Controller('file')
export class FileController {
	constructor(private fileService: FileService) {}

	@UsePipes(ZodValidationPipe)
	@UseInterceptors(FileInterceptor('image', { limits: { fileSize: 1536000 } }))
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post('image')
	async uploadImage(
		@UploadedFile(new ParseFilePipe({ validators: [new FileTypeValidator({ fileType: 'image/png' })] }))
		file: Express.Multer.File,
		@Body() { oldImageFilename }: UploadImageDto
	): Promise<UploadedFileResponse> {
		const result = await this.fileService.uploadImage(file);
		if (oldImageFilename) {
			await this.fileService.deleteFile(oldImageFilename);
		}
		return result;
	}
}
