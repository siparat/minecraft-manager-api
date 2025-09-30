import { forwardRef, Module } from '@nestjs/common';
import { ModService } from './mod.service';
import { ModController } from './mod.controller';
import { ModRepository } from './repositories/mod.repository';
import { DatabaseModule } from 'src/database/database.module';
import { DeeplModule } from 'src/integrations/deepl/deepl.module';
import { ParserModule } from 'src/parser/parser.module';

@Module({
	imports: [DatabaseModule, DeeplModule, forwardRef(() => ParserModule)],
	providers: [ModService, ModRepository],
	controllers: [ModController],
	exports: [ModService, ModRepository]
})
export class ModModule {}
