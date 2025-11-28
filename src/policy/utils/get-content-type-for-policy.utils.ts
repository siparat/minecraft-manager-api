export const getContentTypeForPolicy = (slug: string): string => {
	const ext = slug.split('.').pop();
	switch (ext) {
		case 'txt':
			return 'text/plain; charset=utf-8';
		case 'html':
			return 'text/html; charset=utf-8';
		case 'xml':
			return 'application/xml; charset=utf-8';
		case 'json':
			return 'application/json; charset=utf-8';
		default:
			return 'text/plain; charset=utf-8';
	}
};
