// src/routes/docs/docs-data.ts
const docs = import.meta.glob('./*/+page.md', { eager: true });

const docData = Object.entries(docs).map(([path, module]:any) => {
    const slug = path.split('/').slice(-2, -1)[0];
    return {
        slug,
        metadata: module.metadata,
    };
});

export const getDocData = (slug: string) => {
    return docData.find(doc => doc.slug === slug)?.metadata;
};