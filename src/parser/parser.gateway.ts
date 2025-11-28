import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DOMWindow, JSDOM, VirtualConsole } from 'jsdom';

@Injectable()
export class ParserGateway {
	private host: string;

	constructor(config: ConfigService) {
		this.host = config.getOrThrow('HOST_MODS_API');
	}

	async getModSearchPage(page: number): Promise<DOMWindow | null> {
		try {
			const url = new URL(`page/${page}`, this.host);
			const window = await this.fetchPage(url);
			if (window.document.title.includes('undefined')) {
				return null;
			}
			return window;
		} catch (error) {
			if (error instanceof Response) {
				throw new HttpException(error.statusText, error.status);
			}
			throw error;
		}
	}

	async getModPage(slug: string): Promise<DOMWindow | null> {
		try {
			const url = new URL(slug, this.host).toString();
			return await this.fetchPage(url);
		} catch (error) {
			if (error instanceof Response) {
				Logger.error(`Ошибка при парсинге мода ${slug}: error.statusText`);
			}
			return null;
		}
	}

	private async fetchPage(url: string | URL): Promise<DOMWindow> {
		const res = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36',
				'Accept-Language': 'en-US,en;q=0.9',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8'
			}
		});
		if (!res.ok) {
			throw res;
		}

		const htmlString = await res.text();
		return new JSDOM(htmlString, { runScripts: 'dangerously', virtualConsole: new VirtualConsole() }).window;
	}
}
