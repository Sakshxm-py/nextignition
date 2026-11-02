declare module 'html2canvas' {
  interface Options {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string | null;
    logging?: boolean;
    onclone?: (document: Document) => void;
    [key: string]: any;
  }
  function html2canvas(element: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
  export = html2canvas;
}
