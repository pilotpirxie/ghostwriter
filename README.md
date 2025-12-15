# ghostwriter

Simple TypeScript CLI to split ebooks into per-chapter text files and paraphrase each chapter with citations using OpenAI or Claude.

## Prerequisites

- Node.js 18+
- Pandoc (optional; required for `.mobi` and as fallback for `.epub` / `.pdf`)
- API keys as needed: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

## Install

```bash
npm install
```

## Usage

Run with npx (after install or via `npm link`):

```bash
npx ghostwriter run <input> -o <output-dir> --provider openai --model-name gpt-4o-mini
```

Split only:

```bash
npx ghostwriter split <input> -o <chapters-dir> [--format pdf|epub|txt|md] [--pandoc-path /usr/local/bin/pandoc]
```

Paraphrase an existing chapters directory:

```bash
npx ghostwriter paraphrase <chapters-dir> -o <output-dir> --provider claude --model-name claude-3-haiku-20240307
```

Key flags:

- `--provider openai|claude` and `--model-name <model>` select the LLM.
- `--max-chars-per-call <n>` guardrail for large chapters (defaults to 8000 chars).
- `--pandoc-path <path>` to point at a custom pandoc binary.
- `--temperature`, `--top-p` tune sampling.

Outputs:

- Chapters are saved as `chapter-XX.txt`.
- Paraphrased articles are saved as `chapter-XX.out.txt` with references and call-to-action text.
