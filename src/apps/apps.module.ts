import { Module } from '@nestjs/common';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { FileModule } from 'src/file/file.module';
import { DatabaseModule } from 'src/database/database.module';
import { LanguageRepository } from './repositories/language.repository';
import { AppsRepository } from './repositories/apps.repository';
import { AppIssueRepository } from './repositories/app-issue.repository';
import { AppSdkRepository } from './repositories/app-sdk.repository';
import { ModModule } from 'src/mod/mod.module';

@Module({
	imports: [FileModule, DatabaseModule, ModModule],
	controllers: [AppsController],
	providers: [AppsService, LanguageRepository, AppsRepository, AppIssueRepository, AppSdkRepository]
})
export class AppsModule {}
