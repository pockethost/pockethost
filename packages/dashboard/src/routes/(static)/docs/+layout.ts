// src/routes/docs/+layout.ts
import type { LayoutLoad } from './$types';
import { getDocData } from './docs-data';

export const load: LayoutLoad = async ({ url }) => {
    const slug = url.pathname.split('/').slice(-1)[0] as string;
    const frontmatter = getDocData(slug);

    let title = 'Docs';
    let ogImage = '';
    let description = '';

    if (frontmatter) {
        title = frontmatter.title || 'Docs';
        description = frontmatter.description || '';
        ogImage = `${url.origin}${frontmatter.ogImage}` || '';
    }

    return {
        url: url.href,
        meta: {
            title,
            ogImage,
            description
        }
    };
};