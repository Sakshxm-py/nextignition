import fs from 'fs/promises';
import path from 'path';

type ExtractedDeckText = {
    text: string;
    slides?: { index: number; text: string }[];
    pages?: number;
    slideCount?: number;
    warnings?: string[];
};

const truncate = (value: string, maxChars: number) => {
    if (value.length <= maxChars) return value;
    return value.slice(0, maxChars) + '\n\n[TRUNCATED]';
};

export const extractDeckTextFromBuffer = async (buffer: Buffer, filename: string, mimeType?: string): Promise<ExtractedDeckText> => {
    const ext = path.extname(filename).toLowerCase();
    const inferred = mimeType || (ext === '.pdf' ? 'application/pdf' : undefined);

    if (inferred === 'application/pdf' || ext === '.pdf') {
        // pdf-parse is commonjs; require keeps TS happy in this repo config.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        const rawText = String(data?.text || '').trim();
        return {
            text: truncate(rawText, 60000),
            pages: typeof data?.numpages === 'number' ? data.numpages : undefined,
        };
    }

    if (
        ext === '.pptx' ||
        inferred === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
        try {
            // officeparser is commonjs
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const officeParser = require('officeparser');

            const pptxTextRaw = await officeParser.parseOfficeAsync(buffer);
            const pptxText = String(pptxTextRaw || '').trim();
            const normalized = pptxText.replace(/\r\n/g, '\n');

            // officeparser concatenates text; we heuristically split into slides.
            // Common separators are many newlines or page-break-like markers.
            const chunks = normalized
                .split(/\n{3,}|\f+/g)
                .map((chunk: string) => chunk.trim())
                .filter(Boolean);

            const slides = chunks.map((text: string, idx: number) => ({ index: idx + 1, text }));

            return {
                text: truncate(normalized, 60000),
                slides,
                slideCount: slides.length,
                warnings: slides.length ? undefined : ['No extractable text found in PPTX deck.'],
            };
        } catch (error: any) {
            return {
                text: '',
                warnings: [
                    'Failed to extract text from PPTX deck. Provide PDF for best results.',
                    String(error?.message || error),
                ],
            };
        }
    }

    // PPT/PPTX/DOCX extraction is not implemented in MVP free-only mode.
    // We keep a placeholder so we can still run best-effort AI analysis.
    return {
        text: '',
        warnings: ['Unsupported deck type for text extraction in MVP. Provide PDF for best results.'],
    };
};
