import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AppsModule } from './apps/apps.module';
import { ModModule } from './mod/mod.module';

@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, UserModule, AppsModule, ModModule]
})
export class AppModule {}
