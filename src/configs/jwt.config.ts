import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions, JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (): JwtModuleAsyncOptions => ({
	inject: [ConfigService],
	imports: [ConfigModule],
	useFactory: (config: ConfigService): JwtModuleOptions => ({
		secret: config.getOrThrow('SECRET')
	})
});
