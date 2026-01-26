declare module 'pdfkit' {
  // Tipado mínimo para evitar errores de compilación. Si en el futuro
  // se necesita un tipado más estricto, se puede reemplazar por @types/pdfkit.
  interface PDFDocumentOptions {
    margin?: number;
    [key: string]: any;
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    on(event: string, callback: (...args: any[]) => void): this;
    text(text: string, options?: any): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    moveDown(lines?: number): this;
    addPage(options?: PDFDocumentOptions): this;
    end(): void;
  }

  const PDFKit: typeof PDFDocument;
  export = PDFKit;
}



