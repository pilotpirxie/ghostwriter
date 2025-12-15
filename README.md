# ghostwriter

TypeScript CLI tool for splitting ebooks and processing chapters with LLMs.

Supports PDF, EPUB, Markdown, and TXT formats. Works with OpenAI and Claude.

## Quick Start

```bash
npx @pilotpirxie/ghostwriter --provider claude --api-key YOUR_KEY run book.pdf -o output
```

## Requirements

- Node.js 18+
- OpenAI or Anthropic API key
- Pandoc (optional, improves EPUB/PDF parsing)

Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variable, or use `--api-key` flag.

## Commands

```sh
# split and process ebook in one step.
npx @pilotpirxie/ghostwriter run book.pdf -o output

# split ebook into chapters without AI processing
npx @pilotpirxie/ghostwriter split book.epub -o chapters

# process pre-split chapter files with AI
npx @pilotpirxie/ghostwriter paraphrase chapters/ -o processed
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--provider <name>` | AI provider: `openai` or `claude` | `openai` |
| `--model-name <name>` | Model identifier | `gpt-4o-mini` (OpenAI) or `claude-3-haiku-20240307` (Claude) |
| `--api-key <key>` | API key | - |
| `--prompt-header <text>` | Custom instruction for AI | Default paraphrase |
| `--temperature <n>` | Sampling temperature (0-2) | `0.4` |
| `--max-tokens <n>` | Max tokens per call | `1200` (Claude) |
| `--max-chars-per-call <n>` | Max input chars per call | `8000` |
| `-f, --format <format>` | Force format: `pdf`\|`epub`\|`txt`\|`md` | Auto-detect |
| `--md-heading-level <1-6>` | Markdown heading level for splits | `2` |
| `--pandoc-path <path>` | Custom pandoc binary path | `pandoc` |
| `--top-p <n>` | Nucleus sampling parameter | - |

## Examples

Summarize chapters:
```bash
npx @pilotpirxie/ghostwriter --prompt-header "Summarize in 3 bullet points" run book.pdf -o summaries
```

Translate to Spanish:
```bash
npx @pilotpirxie/ghostwriter --prompt-header "Translate to Spanish" run book.epub -o spanish
```

Custom style:
```bash
npx @pilotpirxie/ghostwriter --prompt-header "Rewrite as a pirate" run story.pdf -o pirate-version
```

Minion style using Claude:
```bash
npx @pilotpirxie/ghostwriter --provider claude --prompt-header "Rewrite the chapter using minions from Despicable me style" run book.epub -o output
```

## License

MIT