import { forwardRef, Module } from '@nestjs/common';
import { ParserGateway } from './parser.gateway';
import { ParserController } from './parser.controller';
import { ParserService } from './parser.service';
import { ModModule } from 'src/mod/mod.module';
import { ScheduleModule } from '@nestjs/schedule';
import { S3Module } from 'src/s3/s3.module';

@Module({
	imports: [forwardRef(() => ModModule), S3Module, ScheduleModule.forRoot()],
	controllers: [ParserController],
	providers: [ParserGateway, ParserService],
	exports: [ParserGateway, ParserService]
})
export class ParserModule {}
