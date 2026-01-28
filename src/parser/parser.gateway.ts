import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, Page } from 'playwright';
import { BrowserPageData } from './interfaces/parser.interface';
import { Server } from './interfaces/servers.interface';
import { JSDOM } from 'jsdom';
import { Craft } from './interfaces/crafts.interface';

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

	async parseServers(): Promise<Server[]> {
		const servers: Map<string, Server> = new Map();
		const browser = await this.createPage();

		for (let page = 1; page <= 5; page++) {
			const url = new URL(`bedrock/${page}`, 'https://minecraft.buzz').toString();
			await browser.goto(url, { waitUntil: 'domcontentloaded', timeout: 10_000 });
			const html = await browser.content();
			const { window } = new JSDOM(html);
			Array.from(window.document.querySelectorAll('tr[typeof="GameServer"]')).forEach((s) => {
				const ip = s.querySelector('data')?.textContent;
				if (!ip) {
					return;
				}

				const [online, limitOnline] = s.querySelector('td:nth-child(5)')!.textContent.trim().split('/').map(Number);

				servers.set(ip, {
					ip,
					title: s.querySelector('h3')!.textContent,
					logo: s.querySelector('img')!.src,
					online,
					limitOnline,
					versions: s.querySelector('span[title="Server Version"]')?.textContent.trim() || 'unknown'
				});
			});
		}
		await browser.close();
		return Array.from(servers.values());
	}

	async parseCrafts(): Promise<Craft[]> {
		const crafts: Set<Craft> = new Set();
		const browser = await this.createPage();

		const url = 'https://ru-minecraft.ru/krafting-v-minecraft.html';
		await browser.goto(url, { waitUntil: 'domcontentloaded', timeout: 10_000 });
		const html = await browser.content();
		const { window } = new JSDOM(html);
		Array.from(window.document.querySelectorAll('img'))
			.filter((i) => i.src.startsWith('https://ru-minecraft.ru/uploads'))
			.forEach((img) => {
				const image = img.src;
				const parent = img.parentElement?.parentElement?.parentElement;
				if (!parent) {
					return;
				}
				const [name, ingredient, _, description] = Array.from(parent.querySelectorAll('td')).map(
					(td) => td.textContent
				);

				if (!name || !ingredient || !description) {
					return;
				}

				crafts.add({ image, name, ingredient, description });
			});
		await browser.close();
		return Array.from(crafts);
	}

	async downloadFile(url: string): Promise<{ savePath: string; filename: string } | null> {
		const page = await this.createPage();
		try {
			const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

			await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

			if ((await page.title()).includes('Just a moment')) {
				Logger.warn({ url }, 'Cloudflare защита обнаружена. Пожалуйста, решите капчу.');
			}

			const download = await downloadPromise;
			const savePath = await download.path();
			if (!savePath) return null;

			const filename = download.suggestedFilename();

			return { savePath, filename };
		} catch (e) {
			Logger.error({ err: e, url }, 'Ошибка скачивания файла через Playwright');
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
