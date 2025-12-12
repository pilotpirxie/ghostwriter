import { Chapter } from '../types.js';

export function buildPrompt(header: string, chapter: Chapter): string {
  const reference = chapter.reference ? `Reference: ${chapter.reference}\n\n` : '';
  return `${header}

Source chapter title: ${chapter.title}
${reference}Source content:
${chapter.content}

Instructions:
- Paraphrase and explain clearly for promotional use.
- Keep factual accuracy; do not invent details.
- Include inline references to the source section/page when available.
- End with a short invitation to explore the full book.`;
}

