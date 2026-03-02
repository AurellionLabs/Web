declare module 'gray-matter' {
  interface GrayMatterFile {
    content: string;
    data: Record<string, unknown>;
    excerpt?: string;
    orig: string;
    language: string;
    matter: string;
    stringify(): string;
  }
  function matter(
    input: string,
    options?: Record<string, unknown>,
  ): GrayMatterFile;
  namespace matter {}
  export = matter;
}
