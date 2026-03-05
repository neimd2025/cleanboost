import { BlogResult, PhotoItem } from '../types';

function buildText(blog: BlogResult): string {
  const lines: string[] = [blog.blog.title, '', blog.blog.intro, ''];

  blog.blog.sections.forEach((section) => {
    lines.push(`[${section.subtitle}]`);
    lines.push(section.body);
    lines.push('');
  });

  lines.push(blog.blog.outro);
  lines.push('');
  lines.push(blog.blog.tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' '));

  return lines.join('\n');
}

function collectUsedPhotos(blog: BlogResult, photos: PhotoItem[]): PhotoItem[] {
  const used = new Set<number>();
  blog.blog.sections.forEach((section) => {
    section.imageIndices.forEach((idx) => {
      if (photos[idx]) {
        used.add(idx);
      }
    });
  });

  return Array.from(used).sort((a, b) => a - b).map((idx) => photos[idx]);
}

function buildHtml(blog: BlogResult, photos: PhotoItem[]): string {
  const usedPhotos = collectUsedPhotos(blog, photos);
  const tags = blog.blog.tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ');

  const sectionsHtml = blog.blog.sections
    .map((section) => {
      const images = section.imageIndices
        .map((idx) => photos[idx])
        .filter(Boolean)
        .map((photo) => `<p><img src="${photo.dataUrl}" alt="현장 사진" style="max-width:100%;height:auto;" /></p>`)
        .join('');

      return `<h3>${section.subtitle}</h3>${images}<p>${section.body.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');

  const galleryHtml = usedPhotos
    .map((photo) => `<p><img src="${photo.dataUrl}" alt="업로드 사진" style="max-width:100%;height:auto;" /></p>`)
    .join('');

  return `
    <article>
      <h1>${blog.blog.title}</h1>
      <p>${blog.blog.intro.replace(/\n/g, '<br />')}</p>
      ${galleryHtml}
      ${sectionsHtml}
      <p>${blog.blog.outro.replace(/\n/g, '<br />')}</p>
      <p>${tags}</p>
    </article>
  `.trim();
}

export async function copyNaverBlogPayload(blog: BlogResult, photos: PhotoItem[]): Promise<void> {
  const plainText = buildText(blog);
  const html = buildHtml(blog, photos);

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    });
    await navigator.clipboard.write([item]);
    return;
  }

  await navigator.clipboard.writeText(plainText);
}
