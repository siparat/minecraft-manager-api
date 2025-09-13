import { Module } from '@nestjs/common';
import { DeeplGateway } from './deepl.gateway';
import { DeeplController } from './deepl.controller';
import { HttpModule } from '@nestjs/axios';
import { getDeeplHttpConfig } from 'src/configs/deepl-http.config';

@Module({
	imports: [HttpModule.registerAsync(getDeeplHttpConfig())],
	controllers: [DeeplController],
	providers: [DeeplGateway],
	exports: [DeeplGateway]
})
export class DeeplModule {}
