import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseArrayPipe,
	ParseEnumPipe,
	ParseIntPipe,
	Post,
	Put,
	Query,
	UseGuards,
	UsePipes
} from '@nestjs/common';
import { ModVersion, Prisma, UserRole } from 'generated/prisma';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/user/guards/role.guard';
import { ModEntity } from './entities/mod.entity';
import { ModService } from './mod.service';
import { CreateModDto } from './dto/create-mod.dto';
import { UpdateModDto } from './dto/update-mod.dto';
import { ModRepository } from './repositories/mod.repository';
import { ModErrorMessages } from './mod.constants';
import { ModSearchResponse } from './interfaces/mod-search-response.interface';
import { ModSortKeys } from './interfaces/mod-sort.interface';

@Controller('mod')
export class ModController {
	constructor(
		private modService: ModService,
		private modRepository: ModRepository
	) {}

	@Get('search')
	async search(
		@Query('take', new ParseIntPipe({ optional: true })) take: number = 10,
		@Query('skip', new ParseIntPipe({ optional: true })) skip: number = 0,
		@Query('q') q?: string,
		@Query('sort_key', new ParseEnumPipe(ModSortKeys, { optional: true })) sortKey?: (typeof ModSortKeys)[number],
		@Query('sort_value', new ParseEnumPipe(Prisma.SortOrder, { optional: true })) sortValue?: Prisma.SortOrder,
		@Query('versions', new ParseArrayPipe({ optional: true, separator: '+' })) versions?: string[]
	): Promise<ModSearchResponse> {
		const sort = sortKey && sortValue ? { key: sortKey, value: sortValue } : undefined;
		take = Math.max(0, take);
		skip = Math.max(0, skip);
		return this.modRepository.search(take, skip, q, versions, sort);
	}

	@Get('versions')
	async getAllVersions(): Promise<ModVersion[]> {
		return this.modRepository.getAllVersions();
	}

	@Get(':id')
	async getById(@Param('id', ParseIntPipe) id: number): Promise<ModEntity> {
		const mod = await this.modRepository.findById(id);
		if (!mod) {
			throw new NotFoundException(ModErrorMessages.NOT_FOUND);
		}
		return new ModEntity(mod).setVersions(mod.versions).setTranslations(mod.translations);
	}

	@UsePipes(ZodValidationPipe)
	@UseGuards(JwtAuthGuard)
	@Post()
	async create(@Body() dto: CreateModDto): Promise<ModEntity> {
		return this.modService.create(dto);
	}

	@UseGuards(JwtAuthGuard)
	@UsePipes(ZodValidationPipe)
	@Put(':id')
	async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModDto): Promise<ModEntity> {
		return this.modService.update(id, dto);
	}

	@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
	@UsePipes(ZodValidationPipe)
	@Delete(':id')
	async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
		return this.modService.delete(id);
	}
}
