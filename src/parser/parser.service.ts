import { Injectable, Logger } from '@nestjs/common';
import { JSDOM, DOMWindow, VirtualConsole } from 'jsdom';
import { Download, ParsedMod, ParsedModShort } from './interfaces/mod.interface';

@Injectable()
export class ParserService {
	createDOM(htmlString: string): DOMWindow {
		return new JSDOM(htmlString, { runScripts: 'dangerously', virtualConsole: new VirtualConsole() }).window;
	}

	parseModsFromSearchPage({ document }: DOMWindow): ParsedModShort[] {
		const cards = document.querySelectorAll('.fancybox.post');
		const mods = Array.from(cards).map(this.handleModCard);
		return mods.filter((m) => !!m);
	}

	async parseMod(slug: string, window: DOMWindow): Promise<ParsedMod | null> {
		const title: string | undefined = window.__NUXT__?.state?.slug?.model?.title;
		if (!title) {
			Logger.error(`Мод ${slug} не найден`);
			return null;
		}

		const image = window.__NUXT__?.state?.slug?.model?.image;
		if (!image) {
			Logger.error(`Лого у мода ${title} отсутствует`);
			return null;
		}

		const downloads: Download[] = window.__NUXT__?.state?.slug?.model?.downloads;
		if (!downloads || !downloads.length) {
			Logger.error(`Файлы у мода ${title} отсутствуют`);
			return null;
		}
		const filteredDownloads = Array.from(new Map(downloads.map((d) => [d.file, d])).values());

		const versions = window.__NUXT__?.state?.slug?.model?.minecraft_versions.map(({ name }) => name) || [];

		const descriptionHtml = (window.__NUXT__?.state?.slug?.model?.description || '').trim();
		if (!descriptionHtml) {
			Logger.error(`Описание у мода ${title} пустое`);
		}
		const divDescription = window.document.createElement('div');
		divDescription.innerHTML = descriptionHtml;
		const description = (divDescription.textContent || '').trim().replace(/\n{2,}/g, '\n');

		const descriptionImages = window.__NUXT__?.state?.slug?.model?.submission_images || [];

		return {
			versions,
			title,
			slug,
			description,
			descriptionHtml,
			descriptionImages,
			downloads: filteredDownloads,
			image
		};
	}

	private handleModCard(card: Element): ParsedModShort | null {
		const slug = card.querySelector<HTMLAnchorElement>('.fancybox__content__title a')?.href.slice(1, -1);
		const title = card.querySelector('.fancybox__content__title')?.textContent;
		const shortDescription = card.querySelector('.fancybox__content__description')?.textContent || undefined;
		const author = card.querySelector('.fancybox__header__content a')?.textContent || undefined;
		const dateString = card
			.querySelector('.fancybox__header__content small')
			?.textContent?.replace('Published on ', '')
			.trim();
		const rating = card.querySelector('.fancybox__header__rating')?.textContent?.trim();
		const image = card.querySelector<HTMLImageElement>('.post__img__static img')?.src;
		if (!slug || !title || !image) {
			console.error('Невозможно собрать данные мода');
			return null;
		}
		return {
			slug,
			title,
			shortDescription,
			author,
			publishedAt: dateString ? new Date(dateString) : undefined,
			rating: Number(rating),
			image
		};
	}
}
