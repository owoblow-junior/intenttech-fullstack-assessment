import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import path from 'node:path';
import { ProfileRecord } from './users.service';

export const displayDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const details = (u: ProfileRecord) => {
  const i = u.userInfo,
    c = u.userContact,
    a = u.userAddress;
  return [
    ['Email', c.email],
    ['Phone', c.phoneNumber],
    ['Fax', c.fax || 'Not provided'],
    ['LinkedIn', c.linkedInUrl || 'Not provided'],
    ['Address', `${a.address}, ${a.city}, ${a.state}, ${a.country}, ${a.zipCode}`],
    ['Date of birth', displayDate(i.dob)],
    ['Gender', i.gender],
  ];
};
@Injectable()
export class ExportsService {
  async pdf(u: ProfileRecord): Promise<Buffer> {
    const pdf = new PDFDocument({
      size: 'A4',
      margin: 52,
      bufferPages: true,
      info: {
        Title: `${u.userInfo.firstName} ${u.userInfo.lastName} — Profile`,
        Author: 'IntentTech Profiles',
      },
    });
    const parts: Buffer[] = [];
    const complete = new Promise<Buffer>((resolve, reject) => {
      pdf.on('data', (p) => parts.push(p));
      pdf.on('end', () => resolve(Buffer.concat(parts)));
      pdf.on('error', reject);
    });
    const fonts = path.resolve(__dirname, '../../assets');
    pdf
      .registerFont('Body', path.join(fonts, 'DejaVuSans.ttf'))
      .registerFont('Strong', path.join(fonts, 'DejaVuSans-Bold.ttf'));
    pdf.font('Body');
    const ensure = (height: number) => {
      if (pdf.y + height > pdf.page.height - 70) {
        pdf.addPage();
        pdf.y = 52;
      }
    };
    const heading = (text: string) => {
      ensure(65);
      pdf
        .moveDown(1.2)
        .font('Strong')
        .fontSize(10)
        .fillColor('#244e47')
        .text(text.toUpperCase(), 52, pdf.y, { characterSpacing: 1.8 });
      pdf.moveDown(0.7);
    };
    const name = `${u.userInfo.firstName} ${u.userInfo.lastName}`;
    pdf.fillColor('#244e47').font('Strong').fontSize(26).text(name, 52, 60, { width: 380 });
    pdf.font('Body').fontSize(12).fillColor('#566764').text(u.userInfo.occupation, { width: 380 });
    const headerEnd = pdf.y;
    pdf.image(Buffer.from(u.userInfo.profilePhoto.split(',')[1], 'base64'), 455, 55, {
      fit: [82, 82],
    });
    pdf.y = Math.max(155, headerEnd + 24);
    pdf.moveTo(52, pdf.y).lineTo(543, pdf.y).strokeColor('#cdd9d1').stroke();
    heading('Profile & contact');
    for (const [label, value] of details(u)) {
      const height = pdf.font('Body').fontSize(10).heightOfString(value, { width: 370 });
      ensure(height + 18);
      const y = pdf.y;
      pdf.font('Strong').fontSize(9).fillColor('#66706a').text(label, 52, y, { width: 100 });
      pdf.font('Body').fontSize(10).fillColor('#263632').text(value, 160, y, { width: 383 });
      pdf.y = y + Math.max(height, 14) + 10;
    }
    heading('Academic background');
    for (const s of u.userAcademics.schools) {
      const strings = [
        s.schoolName,
        `${s.qualification} · ${s.fieldOfStudy}`,
        `${displayDate(s.startDate)} – ${s.endDate ? displayDate(s.endDate) : 'Present'}`,
      ];
      const height = strings.reduce(
        (h, t) => h + pdf.fontSize(11).heightOfString(t, { width: 491 }) + 8,
        0,
      );
      ensure(height + 24);
      pdf
        .font('Strong')
        .fontSize(12)
        .fillColor('#263632')
        .text(strings[0], 52, pdf.y, { width: 491 });
      pdf.moveDown(0.35);
      pdf.font('Body').fontSize(10).text(strings[1], { width: 491 });
      pdf.moveDown(0.35);
      pdf.fontSize(9).fillColor('#66706a').text(strings[2], { width: 491 });
      pdf.moveDown(1.4);
    }
    const range = pdf.bufferedPageRange();
    for (let n = 0; n < range.count; n++) {
      pdf.switchToPage(n);
      pdf
        .font('Body')
        .fontSize(8)
        .fillColor('#7b8580')
        .text(`IntentTech Profiles  ·  ${name}  ·  ${n + 1} / ${range.count}`, 52, 795, {
          width: 491,
          lineBreak: false,
        });
    }
    pdf.end();
    return complete;
  }
  async docx(u: ProfileRecord): Promise<Buffer> {
    const p = (text: string, bold = false) =>
      new Paragraph({
        spacing: { after: 140 },
        children: [new TextRun({ text, bold, size: 22 })],
      });
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const doc = new Document({
      creator: 'IntentTech Profiles',
      title: `${u.userInfo.firstName} ${u.userInfo.lastName} — Profile`,
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22, color: '263632' },
            paragraph: { spacing: { line: 280 } },
          },
        },
        paragraphStyles: [
          {
            id: 'Title',
            name: 'Title',
            basedOn: 'Normal',
            run: { font: 'Calibri', size: 54, color: '263632' },
            paragraph: { spacing: { after: 150 } },
          },
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            run: { bold: true, size: 26, color: '244e47' },
            paragraph: { spacing: { before: 300, after: 180 }, keepNext: true },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            run: { bold: true, size: 23, color: '263632' },
            paragraph: { spacing: { before: 220, after: 120 }, keepNext: true },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } },
          },
          children: [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: none,
                bottom: none,
                left: none,
                right: none,
                insideHorizontal: none,
                insideVertical: none,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 75, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          text: `${u.userInfo.firstName} ${u.userInfo.lastName}`,
                          heading: HeadingLevel.TITLE,
                        }),
                        p(u.userInfo.occupation),
                      ],
                    }),
                    new TableCell({
                      width: { size: 25, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new ImageRun({
                              type: 'jpg',
                              data: Buffer.from(u.userInfo.profilePhoto.split(',')[1], 'base64'),
                              transformation: { width: 88, height: 88 },
                            }),
                          ],
                          alignment: AlignmentType.RIGHT,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new Paragraph({
              text: 'Profile and contact',
              heading: HeadingLevel.HEADING_1,
            }),
            ...details(u).map(
              ([label, value]) =>
                new Paragraph({
                  spacing: { after: 140 },
                  children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)],
                }),
            ),
            new Paragraph({
              text: 'Academic background',
              heading: HeadingLevel.HEADING_1,
            }),
            ...u.userAcademics.schools.flatMap((s) => [
              new Paragraph({
                text: s.schoolName,
                heading: HeadingLevel.HEADING_2,
                keepNext: true,
              }),
              p(`${s.qualification} · ${s.fieldOfStudy}`),
              p(`${displayDate(s.startDate)} – ${s.endDate ? displayDate(s.endDate) : 'Present'}`),
            ]),
          ],
        },
      ],
    });
    return Packer.toBuffer(doc);
  }
}
