import jsPDF from 'jspdf';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  from: {
    name: string;
    email: string;
    address?: string;
    phone?: string;
  };
  to: {
    name: string;
    email?: string;
    address?: string;
  };
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms?: string;
}

export const generateInvoicePDF = (data: InvoiceData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // blue-600
  const grayColor: [number, number, number] = [107, 114, 128]; // gray-500
  const darkColor: [number, number, number] = [17, 24, 39]; // gray-900

  let yPosition = 20;

  // Header - INVOICE
  doc.setFontSize(28);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 20, yPosition, { align: 'right' });

  // Invoice Number and Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  yPosition += 8;
  doc.text(`#${data.invoiceNumber}`, pageWidth - 20, yPosition, { align: 'right' });
  yPosition += 5;
  doc.text(`Date: ${new Date(data.date).toLocaleDateString()}`, pageWidth - 20, yPosition, { align: 'right' });

  if (data.dueDate) {
    yPosition += 5;
    doc.text(`Due: ${new Date(data.dueDate).toLocaleDateString()}`, pageWidth - 20, yPosition, { align: 'right' });
  }

  // From Section
  yPosition = 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grayColor);
  doc.text('FROM:', 20, yPosition);

  yPosition += 6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(data.from.name, 20, yPosition);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  yPosition += 5;
  doc.text(data.from.email, 20, yPosition);

  if (data.from.address) {
    yPosition += 5;
    const addressLines = doc.splitTextToSize(data.from.address, 80);
    doc.text(addressLines, 20, yPosition);
    yPosition += addressLines.length * 5;
  }

  if (data.from.phone) {
    yPosition += 5;
    doc.text(data.from.phone, 20, yPosition);
  }

  // To Section
  yPosition += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...grayColor);
  doc.text('BILL TO:', 20, yPosition);

  yPosition += 6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text(data.to.name, 20, yPosition);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);

  if (data.to.email) {
    yPosition += 5;
    doc.text(data.to.email, 20, yPosition);
  }

  if (data.to.address) {
    yPosition += 5;
    const addressLines = doc.splitTextToSize(data.to.address, 80);
    doc.text(addressLines, 20, yPosition);
    yPosition += addressLines.length * 5;
  }

  // Items Table
  yPosition += 15;
  const tableTop = yPosition;

  // Table Header
  doc.setFillColor(...primaryColor);
  doc.rect(20, yPosition, pageWidth - 40, 8, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  yPosition += 6;
  doc.text('Description', 25, yPosition);
  doc.text('Qty', pageWidth - 90, yPosition, { align: 'right' });
  doc.text('Rate', pageWidth - 60, yPosition, { align: 'right' });
  doc.text('Amount', pageWidth - 25, yPosition, { align: 'right' });

  // Table Rows
  yPosition += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkColor);

  data.items.forEach((item, index) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251); // gray-50
      doc.rect(20, yPosition - 4, pageWidth - 40, 8, 'F');
    }

    const descLines = doc.splitTextToSize(item.description, 100);
    doc.text(descLines, 25, yPosition);
    doc.text(item.quantity.toString(), pageWidth - 90, yPosition, { align: 'right' });
    doc.text(`${data.currency}${item.rate.toFixed(2)}`, pageWidth - 60, yPosition, { align: 'right' });
    doc.text(`${data.currency}${item.amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });

    yPosition += Math.max(8, descLines.length * 5);
  });

  // Totals
  yPosition += 10;
  const totalsX = pageWidth - 70;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);

  doc.text('Subtotal:', totalsX, yPosition);
  doc.text(`${data.currency}${data.subtotal.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });

  if (data.tax) {
    yPosition += 6;
    doc.text('Tax:', totalsX, yPosition);
    doc.text(`${data.currency}${data.tax.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
  }

  yPosition += 8;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 5, yPosition - 2, pageWidth - 20, yPosition - 2);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('Total:', totalsX, yPosition);
  doc.text(`${data.currency}${data.total.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });

  // Notes
  if (data.notes) {
    yPosition += 15;
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('Notes:', 20, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.text(notesLines, 20, yPosition);
    yPosition += notesLines.length * 5;
  }

  // Payment Terms
  if (data.paymentTerms) {
    yPosition += 10;
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('Payment Terms:', 20, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(data.paymentTerms, pageWidth - 40);
    doc.text(termsLines, 20, yPosition);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...grayColor);
  doc.text('Generated by EarnTrack', pageWidth / 2, pageHeight - 15, { align: 'center' });

  // Save PDF
  const fileName = `invoice-${data.invoiceNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
};
