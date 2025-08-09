import { BadGatewayException, Injectable } from '@nestjs/common';
import { DeeplTranslateResponse } from './interfaces/deepl-translation.interface';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { DeeplError } from './interfaces/deepl-error.interface';
import { AxiosError } from 'axios';

@Injectable()
export class DeeplGateway {
	constructor(private httpService: HttpService) {}

	async translate(code: string, text: string): Promise<DeeplTranslateResponse> {
		try {
			const json = {
				text: [text],
				target_lang: code
			};
			const response = await lastValueFrom(
				this.httpService.post<DeeplTranslateResponse | DeeplError>('translate', json)
			);
			if ('message' in response.data) {
				throw new BadGatewayException(response.data.message);
			}
			return response.data;
		} catch (error) {
			if (error instanceof AxiosError) {
				throw new BadGatewayException(error.response?.data.message);
			}
			throw error;
		}
	}
}
