import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { Body, ManagedUpload } from 'aws-sdk/clients/s3';
import { randomUUID } from 'crypto';
import { getS3Config } from 'src/configs/s3.config';

@Injectable()
export class S3Service {
	private s3: S3;
	private bucketName: string;

	constructor(private config: ConfigService) {
		this.s3 = new S3(getS3Config(config));
		this.bucketName = this.config.getOrThrow('S3_BUCKET_NAME');
	}

	async uploadFile(body: Body, key?: string): Promise<ManagedUpload.SendData> {
		try {
			return await this.s3.upload({ Body: body, Bucket: this.bucketName, Key: key || randomUUID() }).promise();
		} catch (error) {
			console.log(error);
			Logger.error('Ошибка при загрузке файла в S3', error);
			throw error;
		}
	}
}
