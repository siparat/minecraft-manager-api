import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AppsModule } from './apps/apps.module';
import { ModModule } from './mod/mod.module';
import { DeeplModule } from './integrations/deepl/deepl.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { path } from 'app-root-path';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		AuthModule,
		UserModule,
		AppsModule,
		ModModule,
		DeeplModule,
		ServeStaticModule.forRoot({
			rootPath: `${join(path, 'uploads')}`,
			serveRoot: '/uploads',
			serveStaticOptions: {
				index: false
			}
		})
	]
})
export class AppModule {}
