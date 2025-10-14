import { Injectable, Logger } from '@nestjs/common';
import { DOMWindow } from 'jsdom';
import { Download, ParsedMod, ParsedModShort } from './interfaces/mod.interface';
import { parseCategory } from './utils/parse-category.util';
import { ParserGateway } from './parser.gateway';

@Injectable()
export class ParserService {
	constructor(private parserGateway: ParserGateway) {}

	parseModsFromSearchPage({ document }: DOMWindow): ParsedModShort[] {
		const cards = document.querySelectorAll('.fancybox.post');
		const mods = Array.from(cards).map(this.handleModCard);
		return mods.filter((m) => !!m);
	}

	async getRelevantLinks(slug: string): Promise<ParsedMod['downloads'] | null> {
		const page = await this.parserGateway.getModPage(slug);
		if (!page) {
			return null;
		}

		const downloads: Download[] = page.__NUXT__?.state?.slug?.model?.downloads;
		if (!downloads || !downloads.length) {
			return null;
		}

		const filteredDownloads = Array.from(new Map(downloads.map((d) => [d.file, d])).values());

		if (filteredDownloads.some(({ file }) => file.startsWith('/leaving'))) {
			return null;
		}

		return filteredDownloads;
	}

	async parseMod(slug: string, window: DOMWindow): Promise<ParsedMod | null> {
		const title: string | undefined = window.__NUXT__?.state?.slug?.model?.title;
		if (!title) {
			Logger.error(`Мод ${slug} не найден`);
			return null;
		}

		const categories: { slug: string }[] = window.__NUXT__?.state?.slug?.model.categories;
		const category = parseCategory(categories);
		if (!category) {
			Logger.error(`Мод ${slug} не имеет необходимую категорию`);
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

		if (filteredDownloads.some(({ file }) => file.startsWith('/leaving'))) {
			Logger.error(`Мод ${slug} введет на другой сайт`);
			return null;
		}

		const commentCounts = window.__NUXT__?.state?.slug?.model?.comments_total || 0;
		const rating = Number(Number(window.__NUXT__?.state?.slug?.model?.comments_rating?.average).toFixed(2));

		const versions = window.__NUXT__?.state?.slug?.model?.minecraft_versions.map(({ name }) => name) || [];

		const descriptionHtml = (window.__NUXT__?.state?.slug?.model?.description || '').trim();
		if (!descriptionHtml) {
			Logger.error(`Описание у мода ${title} пустое`);
		}
		const divDescription = window.document.createElement('div');
		divDescription.innerHTML = descriptionHtml;
		const description = (divDescription.textContent || '').trim().replace(/\n{2,}/g, '\n');

		const descriptionImages = window.__NUXT__?.state?.slug?.model?.submission_images || [];
		const updatedAt = new Date(window.__NUXT__?.state?.slug?.model?.updated_at || Date.now());

		return {
			updatedAt,
			versions,
			title,
			category,
			slug,
			commentCounts,
			rating,
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
