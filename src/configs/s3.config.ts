import { ConfigService } from '@nestjs/config';
import { ClientConfiguration } from 'aws-sdk/clients/acm';

export const getS3Config = (config: ConfigService): ClientConfiguration => ({
	endpoint: config.getOrThrow('S3_ENDPOINT'),
	region: config.getOrThrow('S3_REGION'),
	credentials: {
		accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
		secretAccessKey: config.getOrThrow('S3_SECRET_ACCESS_KEY')
	}
});
