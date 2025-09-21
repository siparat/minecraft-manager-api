import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	FileTypeValidator,
	Get,
	HttpCode,
	HttpStatus,
	Logger,
	NotFoundException,
	Param,
	ParseArrayPipe,
	ParseEnumPipe,
	ParseFilePipe,
	ParseFloatPipe,
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
import { App, AppIssue, AppStatus, IssueStatus, Language, Prisma, User, UserRole } from 'generated/prisma';
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
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserInfo } from 'src/decorators/user-info.decorator';
import { ModCategory } from 'minecraft-manager-schemas';
import { FilterOperation } from 'src/common/types/filter-operations';

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

	@ApiTags('for-builders')
	@ApiOperation({ summary: 'Получение информации о приложении' })
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
	async createApp(@Body() dto: CreateAppDto, @UserInfo() user: User): Promise<AppEntity> {
		const app = await this.appsService.createApp(dto);
		Logger.log(`[${user.username}] Создано новое приложение ${app.id}`);
		return app;
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Put(':id')
	async updateApp(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateAppDto,
		@UserInfo() user: User
	): Promise<AppEntity> {
		const app = await this.appsService.updateApp(id, dto);
		Logger.log(`[${user.username}] Приложение ${app.id} отредактировано`);
		return app;
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Delete(':id')
	async deleteApp(@Param('id', ParseIntPipe) appId: number, @UserInfo() user: User): Promise<void> {
		const app = await this.appsService.deleteApp(appId);
		Logger.log(`[${user.username}] Приложение с id ${appId} было удалено`);
		return app;
	}

	@ApiParam({
		name: 'id',
		type: Number,
		description: 'ID приложения',
		required: true
	})
	@ApiBody({
		required: true,
		examples: { 'Создание претензии': { value: { text: 'Текст претензии', email: 'a@b.ru' } } }
	})
	@ApiTags('for-builders')
	@ApiOperation({ summary: 'Создание претензии' })
	@UsePipes(ZodValidationPipe)
	@Post(':id/issue')
	async createIssue(
		@Body() { text, email }: CreateIssueDto,
		@Param('id', ParseIntPipe) id: number
	): Promise<AppIssueEntity> {
		const issue = this.appsService.createIssue(id, email, text);
		Logger.log(`Претензия от пользователя ${email} создана`);
		return issue;
	}

	@UseGuards(JwtAuthGuard)
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

	@UseGuards(JwtAuthGuard)
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
		@Param('issueId', ParseIntPipe) issueId: number,
		@UserInfo() user: User
	): Promise<AppIssueEntity> {
		const issue = await this.appsService.changeIssueStatus(appId, issueId, IssueStatus.SOLVED);
		Logger.log(`[${user.username}] Претензия с id ${issueId} была решена`);
		return issue;
	}

	@ApiTags('for-builders')
	@ApiOperation({
		summary: 'Поиск модов у приложения',
		description: 'Позволяет искать моды у конкретного приложения с фильтрацией, сортировкой и пагинацией.'
	})
	@ApiParam({
		name: 'appId',
		type: Number,
		description: 'ID приложения',
		example: 42
	})
	@ApiParam({
		name: 'status',
		enum: AppModStatus,
		description: 'Статус мода'
	})
	@ApiQuery({
		name: 'take',
		type: Number,
		required: false,
		description: 'Сколько элементов вернуть (по умолчанию 10)',
		example: 10
	})
	@ApiQuery({
		name: 'skip',
		type: Number,
		required: false,
		description: 'Сколько элементов пропустить (по умолчанию 0)',
		example: 0
	})
	@ApiQuery({
		name: 'q',
		type: String,
		required: false,
		description: 'Поисковая строка'
	})
	@ApiQuery({
		name: 'sort_key',
		enum: ModSortKeys,
		required: false,
		description: 'Поле для сортировки'
	})
	@ApiQuery({
		name: 'sort_value',
		enum: Prisma.SortOrder,
		required: false,
		description: 'Порядок сортировки (asc или desc)'
	})
	@ApiQuery({
		name: 'versions',
		type: String,
		required: false,
		description: 'Фильтр по версиям, несколько через `+`'
	})
	@Get(':appId/mod/:status')
	async searchModsFromApp(
		@Param('appId', ParseIntPipe) appId: number,
		@Param('status', new ParseEnumPipe(AppModStatus)) status: (typeof AppModStatus)[number],
		@Query('take', new ParseIntPipe({ optional: true })) take: number = 10,
		@Query('skip', new ParseIntPipe({ optional: true })) skip: number = 0,
		@Query('q') q?: string,
		@Query('sort_key', new ParseEnumPipe(ModSortKeys, { optional: true })) sortKey?: (typeof ModSortKeys)[number],
		@Query('sort_value', new ParseEnumPipe(Prisma.SortOrder, { optional: true })) sortValue?: Prisma.SortOrder,
		@Query('versions', new ParseArrayPipe({ optional: true, separator: '+' })) versions?: string[],
		@Query('category', new ParseEnumPipe(ModCategory, { optional: true })) category?: ModCategory,
		@Query('rating', new ParseFloatPipe({ optional: true })) rating?: number,
		@Query('commentsCount', new ParseIntPipe({ optional: true })) commentsCount?: number,
		@Query('ratingOperator', new ParseEnumPipe(FilterOperation, { optional: true })) ratingOperator?: FilterOperation,
		@Query('commentsCountOperator', new ParseEnumPipe(FilterOperation, { optional: true }))
		commentsCountOperator?: FilterOperation
	): Promise<ModSearchResponse> {
		const app = await this.appsRepository.findById(appId);
		if (!app) {
			throw new NotFoundException(AppsErrorMessages.NOT_FOUND);
		}
		const searchIsActived = status == 'actived';
		const sort = sortKey && sortValue ? { key: sortKey, value: sortValue } : undefined;
		take = Math.max(0, take);
		skip = Math.max(0, skip);
		const ratingFilter = rating && ratingOperator ? { operator: ratingOperator, value: rating } : undefined;
		const commentsCountFilter =
			commentsCount && commentsCountOperator ? { operator: commentsCountOperator, value: commentsCount } : undefined;
		return this.modRepository.searchModsFromApp(
			appId,
			searchIsActived,
			take,
			skip,
			q,
			versions,
			category,
			ratingFilter,
			commentsCountFilter,
			sort
		);
	}

	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard)
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
		@Param('issueId', ParseIntPipe) issueId: number,
		@UserInfo() user: User
	): Promise<AppIssueEntity> {
		const issue = await this.appsService.changeIssueStatus(appId, issueId, IssueStatus.DELETED);
		Logger.log(`[${user.username}] Претензия с id ${issueId} была удалена`);
		return issue;
	}

	@UsePipes(ZodValidationPipe)
	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Put(':id/sdk')
	async updateSdk(@Body() dto: UpdateSdkDto, @Param('id', ParseIntPipe) appId: number): Promise<AppSdkEntity> {
		return this.appsService.updateSdk(appId, dto);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@Post(':id/sdk/ads/toggle')
	async toggleViewAds(@Param('id', ParseIntPipe) appId: number, @UserInfo() user: User): Promise<AppSdkEntity> {
		const sdk = await this.appsService.toggleViewAds(appId);
		Logger.log(`[${user.username}] Реклама приложения ${appId} была переключена`);
		return sdk;
	}

	@UseGuards(JwtAuthGuard)
	@Patch(':id/status/:status')
	async setNewStatus(
		@Param('id', ParseIntPipe) appId: number,
		@Param('status', new ParseEnumPipe(AppStatus)) status: AppStatus,
		@UserInfo() user: User
	): Promise<AppEntity> {
		const app = await this.appsService.setNewStatus(appId, status);
		Logger.log(`[${user.username}] Статус приложения ${app.id} обновлён`);
		return app;
	}

	@UseInterceptors(FileInterceptor('apk', { limits: { fileSize: 157286400 } }))
	@UseGuards(JwtAuthGuard)
	@Post(':id/apk')
	async uploadApk(
		@UploadedFile(
			new ParseFilePipe({
				validators: [new FileTypeValidator({ fileType: 'application/vnd.android.package-archive' })]
			})
		)
		file: Express.Multer.File,
		@Param('id', ParseIntPipe) appId: number,
		@UserInfo() user: User
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
		Logger.log(`[${user.username}] Загружен apk ${uploadedFile.filename} приложению ${app.id}`);
		return appEntity;
	}

	@UseInterceptors(FileInterceptor('bundle', { limits: { fileSize: 157286400 } }))
	@UseGuards(JwtAuthGuard)
	@Post(':id/bundle')
	async uploadBundle(
		@UploadedFile(
			new ParseFilePipe({
				validators: [new AndroidBundleValidator()]
			})
		)
		file: Express.Multer.File,
		@Param('id', ParseIntPipe) appId: number,
		@UserInfo() user: User
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
		Logger.log(`[${user.username}] Загружен bundle ${uploadedFile.filename} приложению ${app.id}`);
		return appEntity;
	}

	@UseInterceptors(FilesInterceptor('screenshot', undefined, { limits: { fileSize: 1536000 } }))
	@UseGuards(JwtAuthGuard)
	@Post(':id/screenshots')
	async uploadScreenshots(
		@UploadedFiles()
		files: Express.Multer.File[],
		@Param('id', ParseIntPipe) appId: number,
		@UserInfo() user: User
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

		Logger.log(`[${user.username}] Загружено ${result.length} скриншотов приложению ${app.id}`);

		return appEntity;
	}
}
