import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AppsModule } from './apps/apps.module';
import { ModModule } from './mod/mod.module';
import { DeeplModule } from './integrations/deepl/deepl.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { path } from 'app-root-path';
import { ParserModule } from './parser/parser.module';
import { InjectBot, TelegrafModule } from 'nestjs-telegraf';
import { getTelegrafConfig } from './configs/telegraf.config';
import { Telegraf } from 'telegraf';
import { PolicyModule } from './policy/policy.module';

@Module({
	imports: [
		TelegrafModule.forRootAsync(getTelegrafConfig()),
		ConfigModule.forRoot({ isGlobal: true }),
		AuthModule,
		UserModule,
		AppsModule,
		ModModule,
		ParserModule,
		DeeplModule,
		PolicyModule,
		ServeStaticModule.forRoot({
			rootPath: `${join(path, 'uploads')}`,
			serveRoot: '/uploads',
			serveStaticOptions: {
				index: false
			}
		})
	]
})
export class AppModule implements OnApplicationBootstrap {
	constructor(@InjectBot() private bot: Telegraf) {}

	onApplicationBootstrap(): void {
		this.bot.on('message', (ctx) => ctx.reply(`User ID: ${ctx.from.id}\nChat ID: ${ctx.chat.id}`));
	}
}
