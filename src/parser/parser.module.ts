import { Module } from '@nestjs/common';
import { ParserGateway } from './parser.gateway';
import { ParserController } from './parser.controller';
import { ParserService } from './parser.service';
import { ModModule } from 'src/mod/mod.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
	imports: [ModModule, ScheduleModule.forRoot()],
	controllers: [ParserController],
	providers: [ParserGateway, ParserService]
})
export class ParserModule {}
