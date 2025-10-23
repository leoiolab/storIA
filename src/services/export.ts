import { jsPDF } from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { Book } from '../types';

export async function exportToPDF(book: Book) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
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
      if (yPosition > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });

    yPosition += 15;

    if (yPosition > doc.internal.pageSize.getHeight() - margin - 30) {
      doc.addPage();
      yPosition = margin;
    }
  });

  doc.save(`${book.metadata.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

export async function exportToWord(book: Book) {
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

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${book.metadata.title.replace(/[^a-z0-9]/gi, '_')}.docx`);
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



