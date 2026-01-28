import { forwardRef, Module } from '@nestjs/common';
import { ParserGateway } from './parser.gateway';
import { ParserService } from './parser.service';
import { ModModule } from 'src/mod/mod.module';
import { ScheduleModule } from '@nestjs/schedule';
import { S3Module } from 'src/s3/s3.module';
import { FileStorageService } from './file-storage.service';
import { ContentParserService } from './content-parser.service';

@Module({
	imports: [forwardRef(() => ModModule), S3Module, ScheduleModule.forRoot()],
	providers: [ParserGateway, ParserService, FileStorageService, ContentParserService],
	exports: [ParserGateway, ParserService]
})
export class ParserModule {}
