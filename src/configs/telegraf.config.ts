import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModuleAsyncOptions } from 'nestjs-telegraf';

export const getTelegrafConfig = (): TelegrafModuleAsyncOptions => ({
	imports: [ConfigModule],
	inject: [ConfigService],
	useFactory: (config: ConfigService) => ({ token: config.getOrThrow('BOT_TOKEN') })
});
