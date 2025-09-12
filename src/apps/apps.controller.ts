import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	FileTypeValidator,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	ParseArrayPipe,
	ParseEnumPipe,
	ParseFilePipe,
	ParseIntPipe,
	Patch,
	Post,
	Put,
	Query,
	UploadedFile,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
	UsePipes
} from '@nestjs/common';
import { App, AppIssue, AppStatus, IssueStatus, Language, Prisma, UserRole } from 'generated/prisma';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/user/guards/role.guard';
import { CreateAppDto } from './dto/create-app.dto';
import { AppEntity } from './entities/app.entity';
import { AppsService } from './apps.service';
import { LanguageRepository } from './repositories/language.repository';
import { AppsRepository } from './repositories/apps.repository';
import { AppsErrorMessages } from './apps.constants';
import { UpdateAppDto } from './dto/update-app.dto';
import { CreateIssueDto } from './dto/create-issue.dto';
import { AppIssueEntity } from './entities/app-issue.entity';
import { AppIssueRepository } from './repositories/app-issue.repository';
import { AppIssuesCounts } from './interfaces/app-issue.interface';
import { UpdateSdkDto } from './dto/update-sdk.dto';
import { AppSdkEntity } from './entities/app-sdk.entity';
import { AppFullInfo, AppModStatus } from './interfaces/app.interface';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileService } from 'src/file/file.service';
import { AndroidBundleValidator } from './validators/android-bundle.validator';
import { ModSearchResponse } from 'src/mod/interfaces/mod-search-response.interface';
import { ModSortKeys } from 'src/mod/interfaces/mod-sort.interface';
import { ModRepository } from 'src/mod/repositories/mod.repository';

@Controller('apps')
export class AppsController {
	constructor(
		private appsService: AppsService,
		private languageRepository: LanguageRepository,
		private appsRepository: AppsRepository,
		private appIssueRepository: AppIssueRepository,
		private modRepository: ModRepository,
		private fileService: FileService
	) {}

	@Get('languages')
	getAllLanguages(): Promise<Language[]> {
		return this.languageRepository.getAllLanguages();
	}

	@UseGuards(JwtAuthGuard)
	@Get()
	async getAllApps(): Promise<App[]> {
		return this.appsRepository.getAll();
	}

	@UseGuards(JwtAuthGuard)
	@Get(':id')
	async getById(@Param('id', ParseIntPipe) id: number): Promise<AppFullInfo | null> {
		const app = await this.appsRepository.findById(id);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}
		return app;
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Post()
	async createApp(@Body() dto: CreateAppDto): Promise<AppEntity> {
		return this.appsService.createApp(dto);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Put(':id')
	async updateApp(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppDto): Promise<AppEntity> {
		return this.appsService.updateApp(id, dto);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Delete(':id')
	async deleteApp(@Param('id', ParseIntPipe) appId: number): Promise<void> {
		await this.appsService.deleteApp(appId);
	}

	@UsePipes(ZodValidationPipe)
	@Post(':id/issue')
	async createIssue(
		@Body() { text, email }: CreateIssueDto,
		@Param('id', ParseIntPipe) id: number
	): Promise<AppIssueEntity> {
		return this.appsService.createIssue(id, email, text);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Get(':id/issue')
	async searchIssues(
		@Param('id', ParseIntPipe) appId: number,
		@Query('take', new ParseIntPipe({ optional: true })) take: number = 20,
		@Query('skip', new ParseIntPipe({ optional: true })) skip: number = 0,
		@Query('status', new ParseEnumPipe(IssueStatus, { optional: true })) status?: IssueStatus
	): Promise<AppIssue[]> {
		take = Math.max(0, take);
		skip = Math.max(0, skip);
		return this.appIssueRepository.search(appId, take, skip, status);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Get(':id/issue/counts')
	async getIssueCounts(@Param('id', ParseIntPipe) appId: number): Promise<AppIssuesCounts> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		return this.appIssueRepository.getCounts(appId);
	}

	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':id/issue/:issueId/solve')
	async solveAppIssue(
		@Param('id', ParseIntPipe) appId: number,
		@Param('issueId', ParseIntPipe) issueId: number
	): Promise<AppIssueEntity> {
		return this.appsService.changeIssueStatus(appId, issueId, IssueStatus.SOLVED);
	}

	@Get(':appId/mod/:status')
	async searchModsFromApp(
		@Param('appId', ParseIntPipe) appId: number,
		@Param('status', new ParseEnumPipe(AppModStatus)) status: (typeof AppModStatus)[number],
		@Query('take', new ParseIntPipe({ optional: true })) take: number = 10,
		@Query('skip', new ParseIntPipe({ optional: true })) skip: number = 0,
		@Query('q') q?: string,
		@Query('sort_key', new ParseEnumPipe(ModSortKeys, { optional: true })) sortKey?: (typeof ModSortKeys)[number],
		@Query('sort_value', new ParseEnumPipe(Prisma.SortOrder, { optional: true })) sortValue?: Prisma.SortOrder,
		@Query('versions', new ParseArrayPipe({ optional: true, separator: '+' })) versions?: string[]
	): Promise<ModSearchResponse> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}
		const searchIsActived = status == 'actived';
		const sort = sortKey && sortValue ? { key: sortKey, value: sortValue } : undefined;
		take = Math.max(0, take);
		skip = Math.max(0, skip);
		return this.modRepository.searchModsFromApp(appId, searchIsActived, take, skip, q, versions, sort);
	}

	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':appId/mod/:modId/toggle')
	async toggleMod(
		@Param('appId', ParseIntPipe) appId: number,
		@Param('modId', ParseIntPipe) modId: number
	): Promise<AppEntity> {
		return this.appsService.toggleModFromApp(appId, modId);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':id/issue/:issueId/delete')
	async deleteAppIssue(
		@Param('id', ParseIntPipe) appId: number,
		@Param('issueId', ParseIntPipe) issueId: number
	): Promise<AppIssueEntity> {
		return this.appsService.changeIssueStatus(appId, issueId, IssueStatus.DELETED);
	}

	@UsePipes(ZodValidationPipe)
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Put(':id/sdk')
	async updateSdk(@Body() dto: UpdateSdkDto, @Param('id', ParseIntPipe) appId: number): Promise<AppSdkEntity> {
		return this.appsService.updateSdk(appId, dto);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':id/sdk/ads/toggle')
	async toggleViewAds(@Param('id', ParseIntPipe) appId: number): Promise<AppSdkEntity> {
		return this.appsService.toggleViewAds(appId);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Patch(':id/status/:status')
	async setNewStatus(
		@Param('id', ParseIntPipe) appId: number,
		@Param('status', new ParseEnumPipe(AppStatus)) status: AppStatus
	): Promise<AppEntity> {
		return this.appsService.setNewStatus(appId, status);
	}

	@UseInterceptors(FileInterceptor('apk', { limits: { fileSize: 157286400 } }))
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':id/apk')
	async uploadApk(
		@UploadedFile(
			new ParseFilePipe({
				validators: [new FileTypeValidator({ fileType: 'application/vnd.android.package-archive' })]
			})
		)
		file: Express.Multer.File,
		@Param('id', ParseIntPipe) appId: number
	): Promise<AppEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}
		const uploadedFile = await this.fileService.saveFile(file);
		if (app.apk) {
			const filename = app.apk.split('/').pop();
			filename && (await this.fileService.deleteFile(filename));
		}
		const appEntity = new AppEntity({ ...app, apk: uploadedFile.url });
		await this.appsRepository.update(appId, appEntity);
		return appEntity;
	}

	@UseInterceptors(FileInterceptor('bundle', { limits: { fileSize: 157286400 } }))
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':id/bundle')
	async uploadBundle(
		@UploadedFile(
			new ParseFilePipe({
				validators: [new AndroidBundleValidator()]
			})
		)
		file: Express.Multer.File,
		@Param('id', ParseIntPipe) appId: number
	): Promise<AppEntity> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}
		const uploadedFile = await this.fileService.saveFile(file);
		if (app.bundle) {
			const filename = app.bundle.split('/').pop();
			filename && (await this.fileService.deleteFile(filename));
		}
		const appEntity = new AppEntity({ ...app, bundle: uploadedFile.url });
		await this.appsRepository.update(appId, appEntity);
		return appEntity;
	}

	@UseInterceptors(FilesInterceptor('screenshot', undefined, { limits: { fileSize: 1536000 } }))
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':id/screenshots')
	async uploadScreenshots(
		@UploadedFiles()
		files: Express.Multer.File[],
		@Param('id', ParseIntPipe) appId: number
	): Promise<AppEntity> {
		const filesIncludesOnlyImage = !files.some((f) => !f.mimetype.includes('image'));
		if (!filesIncludesOnlyImage) {
			throw new BadRequestException('Некоторые файлы не прошли проверку');
		}
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}

		const result: string[] = [];

		for (const file of files) {
			const uploadedFile = await this.fileService.uploadImage(file);
			result.push(uploadedFile.url);
		}

		const appEntity = new AppEntity(app).setScreenshots(result);
		await this.appsRepository.update(appId, appEntity);

		for (const url of app.appScreenshots) {
			const filename = url.split('/').pop()!;

			await this.fileService.deleteFile(filename);
		}

		return appEntity;
	}
}
