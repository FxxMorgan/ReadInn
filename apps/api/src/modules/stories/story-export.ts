import JSZip from 'jszip';
import PDFDocument from 'pdfkit';

export interface ExportChapter {
  position: number;
  title: string;
  paragraphs: string[];
}

export interface ExportStory {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  chapters: ExportChapter[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function chapterDocument(chapter: ExportChapter): string {
  const paragraphs = chapter.paragraphs
    .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head><title>${escapeXml(chapter.title)}</title><link rel="stylesheet" href="styles.css" /></head>
<body><h1>Capitulo ${chapter.position}: ${escapeXml(chapter.title)}</h1>${paragraphs}</body>
</html>`;
}

export async function buildEpub(story: ExportStory): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" /></rootfiles>
</container>`);

  const manifestItems = story.chapters.map((chapter, index) =>
    `<item id="chapter-${index + 1}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml" />`).join('\n');
  const spineItems = story.chapters.map((_chapter, index) =>
    `<itemref idref="chapter-${index + 1}" />`).join('\n');
  const navItems = story.chapters.map((chapter, index) =>
    `<li><a href="chapter-${index + 1}.xhtml">${escapeXml(chapter.title)}</a></li>`).join('\n');

  zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${escapeXml(story.id)}</dc:identifier>
    <dc:title>${escapeXml(story.title)}</dc:title>
    <dc:creator>${escapeXml(story.author)}</dc:creator>
    <dc:language>es</dc:language>
    <dc:description>${escapeXml(story.synopsis)}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="styles" href="styles.css" media-type="text/css" />
    ${manifestItems}
  </manifest>
  <spine>${spineItems}</spine>
</package>`);
  zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es">
<head><title>Indice</title></head><body><nav epub:type="toc"><h1>Indice</h1><ol>${navItems}</ol></nav></body>
</html>`);
  zip.file('OEBPS/styles.css', 'body{font-family:serif;line-height:1.6;margin:5%;}h1{page-break-before:always;}p{margin:0 0 1em;}');
  story.chapters.forEach((chapter, index) => {
    zip.file(`OEBPS/chapter-${index + 1}.xhtml`, chapterDocument(chapter));
  });

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
}

export function buildPdf(story: ExportStory): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margins: { top: 64, bottom: 64, left: 68, right: 68 },
      info: { Title: story.title, Author: story.author, Subject: story.synopsis },
    });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    document.fontSize(28).text(story.title, { align: 'center' });
    document.moveDown(0.8).fontSize(14).fillColor('#555555').text(story.author, { align: 'center' });
    document.moveDown(2).fontSize(11).fillColor('#333333').text(story.synopsis, { align: 'left' });

    for (const chapter of story.chapters) {
      document.addPage();
      document.fillColor('#111111').fontSize(20).text(`Capitulo ${chapter.position}: ${chapter.title}`);
      document.moveDown(1.2).fontSize(11.5);
      for (const paragraph of chapter.paragraphs) {
        document.text(paragraph, { align: 'justify', lineGap: 3 });
        document.moveDown(0.8);
      }
    }
    document.end();
  });
}
