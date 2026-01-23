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
import { ParserModule } from 'src/parser/parser.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
	imports: [FileModule, DatabaseModule, ModModule, ParserModule, S3Module],
	controllers: [AppsController],
	providers: [AppsService, LanguageRepository, AppsRepository, AppIssueRepository, AppSdkRepository],
	exports: [AppsRepository]
})
export class AppsModule {}
