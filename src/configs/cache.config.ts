import KeyvRedis from '@keyv/redis';
import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const getCacheConfig = (): CacheModuleAsyncOptions => ({
	isGlobal: true,
	imports: [ConfigModule],
	inject: [ConfigService],
	useFactory: (config: ConfigService) => ({
		stores: [new KeyvRedis(config.get('REDIS_URL'))]
	})
});
