import { Module } from '@nestjs/common';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { FileModule } from 'src/file/file.module';
import { DatabaseModule } from 'src/database/database.module';
import { LanguageRepository } from './repositories/language.repository';
import { AppsRepository } from './repositories/apps.repository';

@Module({
	imports: [FileModule, DatabaseModule],
	controllers: [AppsController],
	providers: [AppsService, LanguageRepository, AppsRepository]
})
export class AppsModule {}
