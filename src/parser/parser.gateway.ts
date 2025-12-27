import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, Page } from 'playwright';
import { BrowserPageData } from './interfaces/parser.interface';

@Injectable()
export class ParserGateway implements OnModuleDestroy {
	private browser: Browser;
	private host: string;

	constructor(config: ConfigService) {
		this.host = config.getOrThrow('HOST_MODS_API');
	}

	private async getBrowser(): Promise<Browser> {
		if (!this.browser) {
			this.browser = await chromium.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
		}
		return this.browser;
	}

	private async createPage(): Promise<Page> {
		const browser = await this.getBrowser();
		const page = await browser.newPage({
			userAgent:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36'
		});

		await page.setExtraHTTPHeaders({
			'Accept-Language': 'en-US,en;q=0.9'
		});

		return page;
	}

	async getModSearchPage(pageNumber: number): Promise<string | null> {
		const page = await this.createPage();
		const url = new URL(`page/${pageNumber}`, this.host).toString();

		try {
			await page.goto(url, {
				waitUntil: 'domcontentloaded',
				timeout: 30_000
			});

			if ((await page.title()).includes('Just a moment')) {
				Logger.warn(`Cloudflare защита на странице ${url}`);
				return null;
			}

			await page.waitForSelector('.fancybox.post', {
				timeout: 15_000
			});

			return await page.content();
		} catch (e) {
			Logger.error(`Ошибка при запросе страницы: ${url}`, e);
			return null;
		} finally {
			await page.close();
		}
	}

	async getModPage(slug: string): Promise<BrowserPageData | null> {
		const page = await this.createPage();
		const url = new URL(slug, this.host).toString();

		try {
			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

			if ((await page.title()).includes('Just a moment')) {
				Logger.warn(`Cloudflare защита на странице ${url}`);
				return null;
			}

			await page.waitForFunction(() => (window as any).__NUXT__, { timeout: 15_000 });

			const data = await page.evaluate(() => {
				return {
					html: document.documentElement.outerHTML,
					nuxtState: (window as any).__NUXT__
				};
			});

			return data;
		} catch (e) {
			Logger.error(`Ошибка парсинга ${slug}`, e);
			return null;
		} finally {
			await page.close();
		}
	}

	async onModuleDestroy(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
		}
	}
}
