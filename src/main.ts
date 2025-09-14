import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getSwaggerConfig } from './configs/swagger.config';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	app.enableCors();
	app.setGlobalPrefix('v1');

	const options = new DocumentBuilder().addBearerAuth().addTag('for-builders').addTag('for-admin').build();
	const document = SwaggerModule.createDocument(app, options);

	SwaggerModule.setup('openapi', app, document, getSwaggerConfig());

	await app.listen(3000);
}
bootstrap();
