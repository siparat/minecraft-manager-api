import { HttpModuleAsyncOptions, HttpModuleOptions } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const getDeeplHttpConfig = (): HttpModuleAsyncOptions => ({
	imports: [ConfigModule],
	inject: [ConfigService],
	useFactory: (config: ConfigService): HttpModuleOptions => ({
		baseURL: config.getOrThrow('HOST_DEEPL_API'),
		headers: {
			Authorization: 'DeepL-Auth-Key ' + config.getOrThrow('DEEPL_TOKEN')
		}
	})
});
