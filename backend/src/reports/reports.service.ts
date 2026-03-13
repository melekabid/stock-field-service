import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';
import { Buffer } from 'node:buffer';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../config/prisma.service';

type NoteMap = {
  clientName: string;
  technicianName: string;
  workedHours: string;
  machineType: string;
  warrantyLabel: string;
  description: string;
  difficulties: string;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateInterventionPdf(interventionId: string) {
    const intervention = await this.prisma.intervention.findUniqueOrThrow({
      where: { id: interventionId },
      include: {
        client: true,
        site: true,
        technician: true,
        items: { include: { product: true } },
        photos: true,
        signature: true,
      },
    });

    const uploadRoot = join(process.cwd(), this.configService.get<string>('UPLOAD_DIR') ?? 'uploads');
    const reportsDir = join(uploadRoot, 'reports');
    mkdirSync(reportsDir, { recursive: true });

    const fileName = `${intervention.number}.pdf`;
    const filePath = join(reportsDir, fileName);
    const document = new PDFDocument({ margin: 32, size: 'A4' });

    document.pipe(createWriteStream(filePath));

    const notes = this.parseNotes(intervention);
    const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    const left = document.page.margins.left;
    const top = document.page.margins.top;
    const blue = '#0F6CB8';
    const dark = '#202020';
    const lightBorder = '#8A8A8A';

    const clientSignature = this.loadSignature(intervention.signature?.url);
    const technicianSignature = this.loadSignature(
      intervention.photos.find((photo) => photo.url)?.url ?? null,
    );
    const logo = this.loadLocalAsset('sacoges_logo.png');

    let y = top;

    this.drawHeader(document, {
      x: left,
      y,
      width: pageWidth,
      blue,
      dark,
      logo,
    });
    y += 112;

    y = this.drawSectionTitle(document, {
      x: left,
      y,
      width: pageWidth,
      title: `FICHE D'INTERVENTION ET D'ENGAGEMENT N ${intervention.number}`,
      color: blue,
    });

    y = this.drawFieldLine(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      label: 'Nom et prenom du client',
      value: notes.clientName,
      dark,
    });
    y = this.drawFieldLine(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      label: 'Adress',
      value: intervention.site.address || intervention.site.name,
      dark,
    });
    y = this.drawWarrantyLine(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      warrantyLabel: notes.warrantyLabel,
      dark,
      lightBorder,
    });
    y = this.drawFieldLine(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      label: 'Nom de machine',
      value: notes.machineType,
      dark,
    });

    y = this.drawSectionTitle(document, {
      x: left,
      y: y + 6,
      width: pageWidth,
      title: 'INTERVENTION',
      color: blue,
    });

    y = this.drawDualFieldLine(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      leftLabel: 'Technicien(s)',
      leftValue: notes.technicianName,
      rightLabel: '',
      rightValue: '',
      dark,
    });
    y = this.drawDualFieldLine(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      leftLabel: 'Date',
      leftValue: this.formatDate(intervention.date),
      rightLabel: 'Temps passe',
      rightValue: notes.workedHours,
      dark,
    });

    y = this.drawSectionTitle(document, {
      x: left,
      y: y + 6,
      width: pageWidth,
      title: "DESCRIPTION DE L'INTERVENTION",
      color: blue,
    });
    y = this.drawLinedParagraph(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      height: 92,
      text: notes.description,
      dark,
      lightBorder,
    });

    y = this.drawSectionTitle(document, {
      x: left,
      y: y + 10,
      width: pageWidth,
      title: 'DIFFICULTES RENCONTREES',
      color: blue,
    });
    y = this.drawLinedParagraph(document, {
      x: left + 10,
      y,
      width: pageWidth - 20,
      height: 56,
      text: notes.difficulties,
      dark,
      lightBorder,
    });

    y = this.drawSectionTitle(document, {
      x: left,
      y: y + 10,
      width: pageWidth,
      title: 'PIECES DE RECHANGE CONSOMMABLES',
      color: blue,
    });
    y = this.drawItemsTable(document, {
      x: left + 1,
      y,
      width: pageWidth - 2,
      items: intervention.items.map((item) => ({
        description: item.product.name,
        reference: item.product.code,
        quantity: item.quantity.toString(),
      })),
      dark,
      lightBorder,
    });

    this.drawSignatureArea(document, {
      x: left + 1,
      y: y + 16,
      width: pageWidth - 2,
      clientSignature,
      technicianSignature,
      dark,
      lightBorder,
    });

    document.end();

    const pdfUrl = `/static/reports/${fileName}`;
    await this.prisma.intervention.update({
      where: { id: interventionId },
      data: { pdfUrl },
    });

    return { pdfUrl };
  }

  summary() {
    return this.prisma.intervention.groupBy({
      by: ['status'],
      _count: true,
    });
  }

  private drawHeader(
    document: PDFKit.PDFDocument,
    input: { x: number; y: number; width: number; blue: string; dark: string; logo: Buffer | null },
  ) {
    const { x, y, width, blue, dark, logo } = input;
    if (logo != null) {
      document.image(logo, x + 6, y + 2, { fit: [82, 82], align: 'center', valign: 'center' });
    } else {
      document.circle(x + 46, y + 36, 34).fillAndStroke('#0F6CB8', '#0B4475');
      document
        .fillColor('#FFFFFF')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('S.A.O.C.E.S', x + 12, y + 18, { width: 68, align: 'center' });
      document
        .fontSize(6)
        .font('Helvetica')
        .text('Commerce et Service', x + 12, y + 52, { width: 68, align: 'center' });
    }

    document.rect(x + 110, y + 4, width - 134, 78).lineWidth(1).stroke('#7C7C7C');
    document
      .fillColor(dark)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text("FICHE D'INTERVENTION", x + 132, y + 36, {
        width: width - 178,
        align: 'center',
      });
    document.fillColor(blue);
  }

  private drawSectionTitle(
    document: PDFKit.PDFDocument,
    input: { x: number; y: number; width: number; title: string; color: string },
  ) {
    const { x, y, width, title, color } = input;
    document.rect(x, y, width, 18).fill(color);
    document
      .fillColor('#111111')
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(title, x, y + 4, {
        width,
        align: 'center',
      });
    return y + 28;
  }

  private drawFieldLine(
    document: PDFKit.PDFDocument,
    input: { x: number; y: number; width: number; label: string; value: string; dark: string },
  ) {
    const { x, y, width, label, value, dark } = input;
    document
      .fillColor(dark)
      .font('Helvetica')
      .fontSize(10.5)
      .text(`${label} :`, x, y, { continued: false });
    document
      .font('Helvetica')
      .text(value || '........................................', x + 110, y, {
        width: width - 110,
      });
    document
      .moveTo(x + 110, y + 13)
      .lineTo(x + width, y + 13)
      .lineWidth(0.7)
      .dash(1.2, { space: 1.8 })
      .stroke('#7C7C7C')
      .undash();
    return y + 22;
  }

  private drawDualFieldLine(
    document: PDFKit.PDFDocument,
    input: {
      x: number;
      y: number;
      width: number;
      leftLabel: string;
      leftValue: string;
      rightLabel: string;
      rightValue: string;
      dark: string;
    },
  ) {
    const { x, y, width, leftLabel, leftValue, rightLabel, rightValue, dark } = input;
    const split = x + width * 0.54;

    document.fillColor(dark).font('Helvetica').fontSize(10.5).text(`${leftLabel} :`, x, y);
    document.text(leftValue, x + 78, y, { width: split - x - 92 });
    document
      .moveTo(x + 78, y + 13)
      .lineTo(split - 8, y + 13)
      .lineWidth(0.7)
      .dash(1.2, { space: 1.8 })
      .stroke('#7C7C7C')
      .undash();

    if (rightLabel.length > 0) {
      document.text(`${rightLabel} :`, split + 6, y);
      document.text(rightValue, split + 76, y, { width: x + width - split - 78 });
      document
        .moveTo(split + 76, y + 13)
        .lineTo(x + width, y + 13)
        .lineWidth(0.7)
        .dash(1.2, { space: 1.8 })
        .stroke('#7C7C7C')
        .undash();
    }

    return y + 22;
  }

  private drawWarrantyLine(
    document: PDFKit.PDFDocument,
    input: {
      x: number;
      y: number;
      width: number;
      warrantyLabel: string;
      dark: string;
      lightBorder: string;
    },
  ) {
    const { x, y, warrantyLabel, dark, lightBorder } = input;
    const yes = warrantyLabel === 'Sous garantie';
    document.fillColor(dark).font('Helvetica').fontSize(10.5).text('Garantie :', x, y);
    this.drawCheckbox(document, x + 58, y - 2, 14, yes, lightBorder);
    document.text('OUI', x + 76, y);
    this.drawCheckbox(document, x + 145, y - 2, 14, !yes, lightBorder);
    document.text('NON', x + 163, y);
    return y + 22;
  }

  private drawCheckbox(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    size: number,
    checked: boolean,
    stroke: string,
  ) {
    document.rect(x, y, size, size).lineWidth(1).stroke(stroke);
    if (checked) {
      document
        .moveTo(x + 3, y + size / 2)
        .lineTo(x + 6, y + size - 4)
        .lineTo(x + size - 3, y + 3)
        .lineWidth(1.5)
        .stroke('#0F6CB8');
    }
  }

  private drawLinedParagraph(
    document: PDFKit.PDFDocument,
    input: {
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      dark: string;
      lightBorder: string;
    },
  ) {
    const { x, y, width, height, text, dark, lightBorder } = input;
    document
      .fillColor(dark)
      .font('Helvetica')
      .fontSize(10)
      .text(text || '-', x + 2, y + 2, {
        width: width - 4,
        height: height - 8,
      });

    let lineY = y + 14;
    while (lineY <= y + height) {
      document
        .moveTo(x, lineY)
        .lineTo(x + width, lineY)
        .lineWidth(0.7)
        .dash(1.2, { space: 1.8 })
        .stroke(lightBorder)
        .undash();
      lineY += 18;
    }

    return y + height + 4;
  }

  private drawItemsTable(
    document: PDFKit.PDFDocument,
    input: {
      x: number;
      y: number;
      width: number;
      items: Array<{ description: string; reference: string; quantity: string }>;
      dark: string;
      lightBorder: string;
    },
  ) {
    const { x, y, width, items, dark, lightBorder } = input;
    const headerHeight = 22;
    const rowHeight = 16;
    const rows = Math.max(Math.min(items.length, 3), 3);
    const totalHeight = headerHeight + rows * rowHeight;
    const col1 = width * 0.47;
    const col2 = width * 0.29;

    document.rect(x, y, width, totalHeight).lineWidth(1).stroke(lightBorder);
    document
      .moveTo(x + col1, y)
      .lineTo(x + col1, y + totalHeight)
      .stroke(lightBorder);
    document
      .moveTo(x + col1 + col2, y)
      .lineTo(x + col1 + col2, y + totalHeight)
      .stroke(lightBorder);
    document
      .moveTo(x, y + headerHeight)
      .lineTo(x + width, y + headerHeight)
      .stroke(lightBorder);

    for (let row = 1; row <= rows; row += 1) {
      const rowY = y + headerHeight + row * rowHeight;
      document.moveTo(x, rowY).lineTo(x + width, rowY).dash(1.2, { space: 1.8 }).stroke(lightBorder).undash();
    }

    document
      .fillColor(dark)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text('Description', x, y + 7, { width: col1, align: 'center' })
      .text('Reference', x + col1, y + 7, { width: col2, align: 'center' })
      .text('Quantite', x + col1 + col2, y + 7, { width: width - col1 - col2, align: 'center' });

    document.font('Helvetica').fontSize(9.5);
    items.slice(0, rows).forEach((item, index) => {
      const rowY = y + headerHeight + index * rowHeight + 5;
      document.text(item.description, x + 6, rowY, { width: col1 - 12, ellipsis: true });
      document.text(item.reference, x + col1 + 6, rowY, { width: col2 - 12, ellipsis: true });
      document.text(item.quantity, x + col1 + col2, rowY, {
        width: width - col1 - col2,
        align: 'center',
      });
    });

    return y + totalHeight;
  }

  private drawSignatureArea(
    document: PDFKit.PDFDocument,
    input: {
      x: number;
      y: number;
      width: number;
      clientSignature: Buffer | null;
      technicianSignature: Buffer | null;
      dark: string;
      lightBorder: string;
    },
  ) {
    const { x, y, width, clientSignature, technicianSignature, dark, lightBorder } = input;
    const titleHeight = 20;
    const boxHeight = 118;
    const half = width / 2;

    document.rect(x, y, width, titleHeight + boxHeight).lineWidth(1).stroke(lightBorder);
    document.moveTo(x + half, y).lineTo(x + half, y + titleHeight + boxHeight).stroke(lightBorder);
    document.moveTo(x, y + titleHeight).lineTo(x + width, y + titleHeight).stroke(lightBorder);

    document
      .fillColor(dark)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Signature de Technicien', x, y + 4, { width: half, align: 'center' })
      .text('Signature de Client', x + half, y + 4, { width: half, align: 'center' });

    this.renderSignature(document, technicianSignature, x + 18, y + titleHeight + 12, half - 36, boxHeight - 24);
    this.renderSignature(document, clientSignature, x + half + 18, y + titleHeight + 12, half - 36, boxHeight - 24);
  }

  private renderSignature(
    document: PDFKit.PDFDocument,
    signature: Buffer | null,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    if (signature == null) {
      document.rect(x, y, width, height).lineWidth(0.6).stroke('#C6C6C6');
      document
        .fillColor('#7C7C7C')
        .font('Helvetica-Oblique')
        .fontSize(9)
        .text('Signature non renseignee', x, y + height / 2 - 4, { width, align: 'center' });
      return;
    }

    document.save();
    document.rect(x, y, width, height).fill('#FFFFFF');
    document.restore();
    document.rect(x, y, width, height).lineWidth(0.6).stroke('#C6C6C6');
    document.image(signature, x + 18, y + 14, {
      fit: [width - 36, height - 28],
      align: 'center',
      valign: 'center',
    });
  }

  private parseNotes(intervention: {
    notes: string | null;
    client: { name: string };
    technician: { firstName: string; lastName: string };
    description: string;
  }): NoteMap {
    const read = (label: string) => {
      const lines = (intervention.notes ?? '').split('\n');
      for (const line of lines) {
        const prefix = `${label}:`;
        if (line.startsWith(prefix)) {
          return line.slice(prefix.length).trim();
        }
      }
      return '';
    };

    const descriptionFromNotes = read('Description');
    const knownLabels = new Set(['Client', 'Intervenant', "Nombre d'heure", 'Garantie', 'Type de machine', 'Description']);
    const difficulties = (intervention.notes ?? '')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .filter((line) => {
        const label = line.split(':')[0]?.trim() ?? '';
        return !knownLabels.has(label);
      })
      .join('\n')
      .trim();

    return {
      clientName: read('Client') || intervention.client.name,
      technicianName: read('Intervenant') || `${intervention.technician.firstName} ${intervention.technician.lastName}`,
      workedHours: read("Nombre d'heure") || '-',
      machineType: read('Type de machine') || '-',
      warrantyLabel: read('Garantie') || 'Non garantie',
      description: descriptionFromNotes || intervention.description || '-',
      difficulties: difficulties || 'Aucune difficulte renseignee.',
    };
  }

  private formatDate(date: Date) {
    const current = new Date(date);
    const day = `${current.getDate()}`.padStart(2, '0');
    const month = `${current.getMonth() + 1}`.padStart(2, '0');
    const year = current.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private loadSignature(source: string | null | undefined) {
    if (!source) {
      return null;
    }

    if (source.startsWith('data:image')) {
      const raw = source.split(',')[1];
      if (!raw) {
        return null;
      }
      return Buffer.from(raw, 'base64');
    }

    if (source.startsWith('/')) {
      const localPath = join(process.cwd(), source.replace(/^\/+/, ''));
      if (existsSync(localPath)) {
        return readFileSync(localPath);
      }
    }

    return null;
  }

  private loadLocalAsset(fileName: string) {
    const localPath = join(process.cwd(), 'assets', fileName);
    if (!existsSync(localPath)) {
      return null;
    }
    return readFileSync(localPath);
  }
}
