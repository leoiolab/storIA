import { jsPDF } from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, Packer, PageSize } from 'docx';
import { saveAs } from 'file-saver';
import { Book } from '../types';

export type BookFormat = 'trade' | 'mass-market' | 'large-format';

export interface BookFormatDimensions {
  width: number; // in inches
  height: number; // in inches
  widthMM: number; // in millimeters (for jsPDF)
  heightMM: number; // in millimeters (for jsPDF)
  name: string;
  description: string;
}

export const BOOK_FORMATS: Record<BookFormat, BookFormatDimensions> = {
  'trade': {
    width: 6,
    height: 9,
    widthMM: 152.4, // 6 inches = 152.4 mm
    heightMM: 228.6, // 9 inches = 228.6 mm
    name: 'Trade Paperback',
    description: '6" × 9" (15.24 × 22.86 cm) — Most common'
  },
  'mass-market': {
    width: 4.25,
    height: 6.87,
    widthMM: 107.95, // 4.25 inches = 107.95 mm
    heightMM: 174.5, // 6.87 inches = 174.5 mm
    name: 'Mass Market',
    description: '4.25" × 6.87" (10.8 × 17.5 cm) — Smaller, cheaper'
  },
  'large-format': {
    width: 7,
    height: 10,
    widthMM: 177.8, // 7 inches = 177.8 mm
    heightMM: 254, // 10 inches = 254 mm
    name: 'Large Format',
    description: '7" × 10" (17.78 × 25.4 cm) — Coffee table books'
  }
};

export async function exportToPDF(book: Book, format: BookFormat = 'trade') {
  const formatSpec = BOOK_FORMATS[format];
  
  // Create PDF with custom page size (in mm)
  const doc = new jsPDF({
    orientation: formatSpec.widthMM < formatSpec.heightMM ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [formatSpec.widthMM, formatSpec.heightMM]
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // 15mm margin
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Title page
  doc.setFontSize(24);
  doc.text(book.metadata.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  if (book.metadata.author) {
    doc.setFontSize(14);
    doc.text(`by ${book.metadata.author}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;
  }

  doc.addPage();
  yPosition = margin;

  // Chapters
  const sortedChapters = [...book.chapters].sort((a, b) => a.order - b.order);

  sortedChapters.forEach((chapter, index) => {
    // Chapter title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Chapter ${index + 1}: ${chapter.title}`, margin, yPosition);
    yPosition += 10;

    // Chapter content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    const lines = doc.splitTextToSize(chapter.content, maxWidth);
    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });

    yPosition += 15;

    if (yPosition > pageHeight - margin - 30) {
      doc.addPage();
      yPosition = margin;
    }
  });

  const formatSuffix = format !== 'trade' ? `_${format.replace('-', '_')}` : '';
  doc.save(`${book.metadata.title.replace(/[^a-z0-9]/gi, '_')}${formatSuffix}.pdf`);
}

export async function exportToWord(book: Book, format: BookFormat = 'trade') {
  const formatSpec = BOOK_FORMATS[format];
  const sortedChapters = [...book.chapters].sort((a, b) => a.order - b.order);

  const children = [
    // Title page
    new Paragraph({
      text: book.metadata.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    }),
  ];

  if (book.metadata.author) {
    children.push(
      new Paragraph({
        text: `by ${book.metadata.author}`,
        spacing: { after: 400 },
      })
    );
  }

  // Chapters
  sortedChapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        text: `Chapter ${index + 1}: ${chapter.title}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // Split content into paragraphs
    const paragraphs = chapter.content.split('\n\n');
    paragraphs.forEach(para => {
      if (para.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun(para.trim())],
            spacing: { after: 200 },
          })
        );
      }
    });
  });

  // Convert inches to twips (1 inch = 1440 twips)
  const widthTwips = Math.round(formatSpec.width * 1440);
  const heightTwips = Math.round(formatSpec.height * 1440);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: widthTwips,
              height: heightTwips,
            },
            margin: {
              top: 1440, // 1 inch = 1440 twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const formatSuffix = format !== 'trade' ? `_${format.replace('-', '_')}` : '';
  saveAs(blob, `${book.metadata.title.replace(/[^a-z0-9]/gi, '_')}${formatSuffix}.docx`);
}

export function exportToMarkdown(book: Book): string {
  const sortedChapters = [...book.chapters].sort((a, b) => a.order - b.order);

  let markdown = `# ${book.metadata.title}\n\n`;

  if (book.metadata.author) {
    markdown += `**by ${book.metadata.author}**\n\n`;
  }

  if (book.metadata.synopsis) {
    markdown += `## Synopsis\n\n${book.metadata.synopsis}\n\n`;
  }

  markdown += `---\n\n`;

  sortedChapters.forEach((chapter, index) => {
    markdown += `## Chapter ${index + 1}: ${chapter.title}\n\n`;
    markdown += `${chapter.content}\n\n`;
    markdown += `---\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${book.metadata.title.replace(/[^a-z0-9]/gi, '_')}.md`);

  return markdown;
}

export function exportToPlainText(book: Book): string {
  const sortedChapters = [...book.chapters].sort((a, b) => a.order - b.order);

  let text = `${book.metadata.title}\n`;

  if (book.metadata.author) {
    text += `by ${book.metadata.author}\n`;
  }

  text += `\n${'='.repeat(50)}\n\n`;

  sortedChapters.forEach((chapter, index) => {
    text += `Chapter ${index + 1}: ${chapter.title}\n\n`;
    text += `${chapter.content}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${book.metadata.title.replace(/[^a-z0-9]/gi, '_')}.txt`);

  return text;
}








