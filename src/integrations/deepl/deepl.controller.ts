import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { DeeplGateway } from './deepl.gateway';
import { ZodValidationPipe } from 'nestjs-zod';
import { DeeplTranslateResponse } from './interfaces/deepl-translation.interface';
import { TranslateDto } from './dto/translate.dto';

@Controller('deepl')
export class DeeplController {
	constructor(private deeplGateway: DeeplGateway) {}

	@UsePipes(ZodValidationPipe)
	@UseGuards(JwtAuthGuard)
	@Post('translate')
	async translateText(@Body() { code, text }: TranslateDto): Promise<DeeplTranslateResponse> {
		return this.deeplGateway.translate(code, text);
	}
}
