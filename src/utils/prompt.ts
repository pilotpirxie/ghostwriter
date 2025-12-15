import { Chapter } from "../types.js";

export function buildPrompt(header: string, chapter: Chapter): string {
  return `${header}

Chapter title: ${chapter.title}

Content:
${chapter.content}`;
}
