import { ConfigService } from '@nestjs/config';
import { ClientConfiguration } from 'aws-sdk/clients/acm';

export const getS3Config = (config: ConfigService): ClientConfiguration => ({
	endpoint: 'https://s3.twcstorage.ru',
	region: 'ru-1',
	credentials: {
		accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
		secretAccessKey: config.getOrThrow('S3_SECRET_ACCESS_KEY')
	}
});
