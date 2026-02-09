import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getSwaggerConfig } from './configs/swagger.config';
import { json, urlencoded } from 'express';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	app.use(json({ limit: '50mb' }));
	app.use(urlencoded({ extended: true, limit: '50mb' }));
	app.enableCors();
	app.setGlobalPrefix('v1');

	const options = new DocumentBuilder().addBearerAuth().addTag('for-builders').addTag('for-admin').build();
	const document = SwaggerModule.createDocument(app, options);

	SwaggerModule.setup('openapi', app, document, getSwaggerConfig());

	await app.listen(3000);
}
bootstrap();
