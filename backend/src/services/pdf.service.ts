import PDFDocument from 'pdfkit';

/**
 * Generate a professional Certificate PDF using PDFKit
 * Returns a Buffer containing the PDF data
 */
export function generateCertificatePdf(
  studentName: string,
  courseName: string,
  studentCode: string,
  certificateCode: string,
  issueDate: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Page dimensions
      const width = 841.89; // A4 landscape width
      const height = 595.28; // A4 landscape height

      // ================= BACKGROUND DESIGN =================
      
      // Cream background
      doc.rect(0, 0, width, height).fill('#FCFBF7');

      // Decorative golden/blue corners
      // Top-Left corner shape
      doc.path('M 0 0 L 120 0 L 0 120 Z').fill('#0F172A');
      doc.path('M 0 0 L 140 0 L 0 140 Z').lineWidth(3).stroke('#D4AF37'); // Gold border accent

      // Bottom-Right corner shape
      doc.path(`M ${width} ${height} L ${width - 120} ${height} L ${width} ${height - 120} Z`).fill('#0F172A');
      doc.path(`M ${width} ${height} L ${width - 140} ${height} L ${width} ${height - 140} Z`).lineWidth(3).stroke('#D4AF37');

      // Double borders
      // Outer border
      doc.rect(20, 20, width - 40, height - 40)
        .lineWidth(4)
        .stroke('#0F172A');

      // Inner border
      doc.rect(26, 26, width - 52, height - 52)
        .lineWidth(1.5)
        .stroke('#D4AF37');

      // ================= CONTENT =================

      // Logo/Header
      doc.fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(28)
        .text('KODETOCAREER', 0, 60, { align: 'center' });

      doc.fillColor('#D4AF37')
        .font('Helvetica')
        .fontSize(10)
        .text('TRAINING & PLACEMENT MANAGEMENT PLATFORM', 0, 95, { align: 'center', characterSpacing: 1.5 });

      // Main Title
      doc.fillColor('#0F172A')
        .font('Times-Bold')
        .fontSize(36)
        .text('CERTIFICATE OF COMPLETION', 0, 150, { align: 'center' });

      // Presentational Text
      doc.fillColor('#64748B')
        .font('Helvetica-Oblique')
        .fontSize(14)
        .text('This is proudly presented to', 0, 210, { align: 'center' });

      // Student Name
      doc.fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(32)
        .text(studentName, 0, 240, { align: 'center' });

      // Student Code
      doc.fillColor('#64748B')
        .font('Helvetica')
        .fontSize(10)
        .text(`Student ID: ${studentCode}`, 0, 280, { align: 'center' });

      // For completing text
      doc.fillColor('#64748B')
        .font('Helvetica-Oblique')
        .fontSize(14)
        .text('for successfully completing the course program', 0, 310, { align: 'center' });

      // Course Name
      doc.fillColor('#D4AF37')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text(courseName, 0, 340, { align: 'center' });

      // Date & Signatures
      const dateString = issueDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Left Column: Date & ID
      doc.fillColor('#0F172A')
        .font('Helvetica')
        .fontSize(11)
        .text(`Date of Issue: ${dateString}`, 80, 440);
        
      doc.fontSize(10)
        .fillColor('#64748B')
        .text(`Verification Code: ${certificateCode}`, 80, 465);

      doc.fontSize(9)
        .text('Verify at: https://kodetocareer.com/verify', 80, 485);

      // Right Column: Signature
      doc.moveTo(width - 250, 450)
        .lineTo(width - 80, 450)
        .lineWidth(1)
        .stroke('#94A3B8');

      // Decorative Signature Text
      doc.fillColor('#0F172A')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Authorized Signatory', width - 250, 460, { width: 170, align: 'center' });

      doc.fillColor('#64748B')
        .font('Helvetica')
        .fontSize(9)
        .text('KodetoCareer Training Board', width - 250, 480, { width: 170, align: 'center' });

      // End document
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
