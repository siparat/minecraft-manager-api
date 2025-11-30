import {
	Body,
	Controller,
	Delete,
	Get,
	Headers,
	HttpCode,
	HttpStatus,
	Logger,
	Param,
	ParseArrayPipe,
	ParseEnumPipe,
	ParseFloatPipe,
	ParseIntPipe,
	Post,
	Put,
	Query,
	Res,
	UseGuards,
	UsePipes
} from '@nestjs/common';
import { ModVersion, Prisma, User, UserRole } from 'generated/prisma';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/user/guards/role.guard';
import { ModEntity } from './entities/mod.entity';
import { ModService } from './mod.service';
import { CreateModDto } from './dto/create-mod.dto';
import { UpdateModDto } from './dto/update-mod.dto';
import { ModRepository } from './repositories/mod.repository';
import { ModSearchResponse } from './interfaces/mod-search-response.interface';
import { ModSortKeys } from './interfaces/mod-sort.interface';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Telegraf } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { UserInfo } from 'src/decorators/user-info.decorator';
import { FilterOperation } from 'src/common/types/filter-operations';
import { ModCategory } from 'minecraft-manager-schemas';

@Controller('mod')
export class ModController {
	constructor(
		private modService: ModService,
		private modRepository: ModRepository,
		@InjectBot() private bot: Telegraf,
		private config: ConfigService
	) {}

	@Get('search')
	async search(
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
		const sort = sortKey && sortValue ? { key: sortKey, value: sortValue } : undefined;
		const ratingFilter = rating && ratingOperator ? { operator: ratingOperator, value: rating } : undefined;
		const commentsCountFilter =
			commentsCount && commentsCountOperator ? { operator: commentsCountOperator, value: commentsCount } : undefined;
		take = Math.max(0, take);
		skip = Math.max(0, skip);
		return this.modRepository.search(take, skip, q, versions, category, ratingFilter, commentsCountFilter, sort);
	}

	@Get('versions')
	async getAllVersions(): Promise<ModVersion[]> {
		return this.modRepository.getAllVersions();
	}

	@ApiTags('for-builders')
	@Get(':id')
	async getById(@Param('id', ParseIntPipe) id: number, @Headers('Language') languageCode?: string): Promise<ModEntity> {
		const mod = await this.modService.findById(id, languageCode);
		const description = mod.translations[0]?.description;
		if (languageCode && description) {
			mod.description = description;
		}
		mod.translations = [];
		return mod;
	}

	@UsePipes(ZodValidationPipe)
	@UseGuards(JwtAuthGuard)
	@Post()
	async create(@Body() dto: CreateModDto, @UserInfo() user: User): Promise<ModEntity> {
		const mod = await this.modService.create(dto);
		Logger.log(`[${user.username}] Новый мод ${mod.title} создан`);
		return mod;
	}

	@UseGuards(JwtAuthGuard)
	@UsePipes(ZodValidationPipe)
	@Put(':id')
	async update(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateModDto,
		@UserInfo() user: User
	): Promise<ModEntity> {
		const mod = await this.modService.update(id, dto);
		Logger.log(`[${user.username}] Мод ${mod.title} изменён`);
		return mod;
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Delete(':id')
	async delete(@Param('id', ParseIntPipe) id: number, @UserInfo() user: User): Promise<void> {
		await this.modService.delete(id);
		Logger.log(`[${user.username}] Удален мод с id - ${id}`);
	}

	@ApiTags('for-admin')
	@ApiOperation({ summary: 'Запуск поиска неактуальных модов' })
	@HttpCode(HttpStatus.OK)
	@UseGuards(JwtAuthGuard)
	@Post('check-deprecated-mods')
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async detectDeprecatedMods(@Res() res?: Response): Promise<void> {
		const adminId = this.config.get('ADMIN_CHAT_ID');
		if (!adminId) {
			res?.sendStatus(HttpStatus.BAD_REQUEST);
			Logger.error('Администратор не найден, невозможно отправить список неактуальных модов');
		}
		res?.sendStatus(HttpStatus.OK);
		const deprecatedMods = await this.modService.searchDeprecatedMods();
		if (!deprecatedMods.length) {
			return;
		}

		const message = `Найдено *${deprecatedMods.length}* модов, отсутствующих у хоста:${deprecatedMods.map(({ url, title, packageName }) => `\n\n[${url.toString()}](${url.toString()}) | ${title} (*${packageName}*)`)}`;

		try {
			await this.bot.telegram.sendMessage(adminId, message, { parse_mode: 'Markdown' });
		} catch (error) {
			Logger.error(error);
		}
	}
}
