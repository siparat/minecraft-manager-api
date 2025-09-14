import { SwaggerCustomOptions } from '@nestjs/swagger';
import { Request } from 'express';

export const getSwaggerConfig = (): SwaggerCustomOptions => {
	return {
		useGlobalPrefix: true,
		swaggerOptions: {
			persistAuthorization: true,
			requestInterceptor: (req: Request): Request => {
				const token = localStorage.getItem('token');
				if (token) {
					req.headers['Authorization'] = `Bearer ${token}`;
				}
				return req;
			}
		}
	};
};
