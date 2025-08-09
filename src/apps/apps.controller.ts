import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	NotFoundException,
	Param,
	ParseEnumPipe,
	ParseIntPipe,
	Post,
	Put,
	Query,
	UseGuards,
	UsePipes
} from '@nestjs/common';
import { App, AppIssue, IssueStatus, Language, UserRole } from 'generated/prisma';
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
import { AppFullInfo } from './interfaces/app.interface';

@Controller('apps')
export class AppsController {
	constructor(
		private appsService: AppsService,
		private languageRepository: LanguageRepository,
		private appsRepository: AppsRepository,
		private appIssueRepository: AppIssueRepository
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
	async createIssue(@Body() { text }: CreateIssueDto, @Param('id', ParseIntPipe) id: number): Promise<AppIssueEntity> {
		return this.appsService.createIssue(id, text);
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
}
