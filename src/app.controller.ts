import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Inject, InternalServerErrorException, Logger } from '@nestjs/common';
import { ServersCacheKeys } from './caches/servers.cache';
import { ParsedServersData } from './parser/interfaces/servers.interface';
import { ParserGateway } from './parser/parser.gateway';
import { ParserErrorMessages } from './parser/parser.constants';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('/')
export class AppController {
	constructor(
		@Inject(CACHE_MANAGER) private cache: Cache,
		private parserGateway: ParserGateway
	) {}

	@ApiTags('for-builders')
	@ApiOperation({
		summary: 'Спарсить список серверов'
	})
	@Get('servers')
	async getServers(): Promise<ParsedServersData> {
		const lastResult = await this.cache.get<ParsedServersData>(ServersCacheKeys.FRESH);
		if (lastResult) {
			return lastResult;
		}

		try {
			const servers = await this.parserGateway.parseServers();
			const data: ParsedServersData = {
				updatedAt: new Date().toISOString(),
				data: servers
			};
			await this.cache.set(ServersCacheKeys.FRESH, data, 1000 * 60 * 60);
			await this.cache.set(ServersCacheKeys.FALLBACK, data);
			return data;
		} catch (error) {
			Logger.error(error);
			const fallback = await this.cache.get<ParsedServersData>(ServersCacheKeys.FALLBACK);
			if (fallback) {
				return fallback;
			}
			throw new InternalServerErrorException(ParserErrorMessages.PARSING_SERVERS_ERROR);
		}
	}
}
