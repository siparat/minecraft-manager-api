import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseIntPipe,
	Post,
	Put,
	UseGuards,
	UsePipes
} from '@nestjs/common';
import { App, Language, UserRole } from 'generated/prisma';
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

@Controller('apps')
export class AppsController {
	constructor(
		private appsService: AppsService,
		private languageRepository: LanguageRepository,
		private appsRepository: AppsRepository
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
	async getById(@Param('id', ParseIntPipe) id: number): Promise<App | null> {
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
}
