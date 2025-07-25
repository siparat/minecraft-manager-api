import { Module } from '@nestjs/common';
import { ModService } from './mod.service';
import { ModController } from './mod.controller';
import { ModRepository } from './repositories/mod.repository';
import { DatabaseModule } from 'src/database/database.module';

@Module({
	imports: [DatabaseModule],
	providers: [ModService, ModRepository],
	controllers: [ModController]
})
export class ModModule {}
