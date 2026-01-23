export const fetchFile = async (url: string): Promise<Response> => {
	return fetch(url, { redirect: 'follow' });
};
