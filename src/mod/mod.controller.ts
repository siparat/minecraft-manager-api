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
import { ModReactionType, ModVersion, Prisma, User, UserRole } from 'generated/prisma';
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
import { ApiBody, ApiHeader, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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

	@Get(':id/reactions')
	async getReactions(
		@Param('id', ParseIntPipe) id: number,
		@Headers('x-client-user-id') clientUserId?: string
	): Promise<{ selected: ModReactionType | null; counts: Record<ModReactionType, number>; total: number }> {
		return this.modService.getReactions(id, clientUserId);
	}

	@HttpCode(HttpStatus.OK)
	@ApiHeader({
		name: 'X-Client-User-Id',
		required: true,
		description: 'Стабильный идентификатор пользователя мобильного приложения'
	})
	@ApiBody({
		required: true,
		schema: {
			type: 'object',
			required: ['reaction'],
			properties: {
				reaction: {
					enum: Object.values(ModReactionType),
					nullable: true,
					description: 'Новая реакция. null снимает реакцию пользователя с мода.'
				}
			}
		},
		examples: {
			'Поставить реакцию': { value: { reaction: ModReactionType.LOVE } },
			'Снять реакцию': { value: { reaction: null } }
		}
	})
	@Put(':id/reactions')
	async setReaction(
		@Param('id', ParseIntPipe) id: number,
		@Headers('x-client-user-id') clientUserId: string | undefined,
		@Body('reaction') reaction: ModReactionType | null | undefined
	): Promise<void> {
		await this.modService.setReaction(id, clientUserId, reaction);
	}

	@ApiTags('for-admin')
	@ApiOperation({ summary: 'Получить скачивания мода по приложениям' })
	@ApiOkResponse({
		schema: {
			example: {
				total: 42,
				apps: [{ appId: 1, packageName: 'com.example.app', name: 'Example App', downloadsCount: 42 }]
			}
		}
	})
	@UseGuards(JwtAuthGuard)
	@Get(':id/downloads')
	async getDownloads(
		@Param('id', ParseIntPipe) id: number
	): Promise<{ total: number; apps: { appId: number; packageName: string; name: string; downloadsCount: number }[] }> {
		return this.modService.getDownloads(id);
	}

	@ApiTags('for-builders')
	@ApiQuery({
		name: 'appId',
		type: Number,
		required: false,
		description: 'ID текущего приложения для similarMods и trendingPosition'
	})
	@ApiOkResponse({
		schema: {
			example: {
				id: 1,
				title: 'Example mod',
				trendingPosition: 4,
				similarMods: [{ id: 2, title: 'Another mod' }]
			}
		}
	})
	@Get(':id')
	async getById(
		@Param('id', ParseIntPipe) id: number,
		@Headers('Language') languageCode?: string,
		@Query('appId', new ParseIntPipe({ optional: true })) appId?: number
	): Promise<ModEntity> {
		const mod = await this.modService.findById(id, languageCode, appId);
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
