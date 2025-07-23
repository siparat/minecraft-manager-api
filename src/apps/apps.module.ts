import { Module } from '@nestjs/common';
import { AppsService } from './apps.service';
import { AppsController } from './apps.controller';
import { FileModule } from 'src/file/file.module';

@Module({
	imports: [FileModule],
	controllers: [AppsController],
	providers: [AppsService]
})
export class AppsModule {}
