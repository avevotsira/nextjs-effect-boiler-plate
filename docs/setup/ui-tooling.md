# UI tooling for coding agents

Tools that keep agent-built UI from looking AI-made ("clanker UI") and check
it against accessibility rules. Added 2026-10-04.

## On a new machine

The skills and the review command are committed under `.claude/`, so `git pull`
brings them. Two steps are per machine:

```sh
npm install                       # includes the playwright dev dependency
npx playwright install chromium   # browser binary, ~150 MB, not in git
```

Check it works:

```sh
npx playwright screenshot --viewport-size=375,812 https://example.com shot.png
```

Then restart Claude Code (or open a new session) so it picks up the skills.

## What is installed

| Tool                            | Where                                                                        | Use                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Playwright                      | `package.json` devDependency                                                 | The agent screenshots its pages at phone (375 px) and desktop (1440 px) width and looks at them before handing UI over.     |
| Vercel Web Interface Guidelines | `.claude/commands/web-interface-guidelines.md`                               | `/web-interface-guidelines <file-or-glob>`: reviews UI code against 100+ rules (keyboard, focus, labels, forms, motion).    |
| Impeccable (Paul Bakaus)        | `.claude/skills/impeccable/`                                                 | `/impeccable`: anti-pattern checks for AI-looking design (spacing, type, colour, cards inside cards).                       |
| Emil Kowalski's skills          | `.claude/skills/{emil-design-eng,review-animations,break-ui,mobile-native}/` | UI polish and motion; `break-ui` feeds worst-case data (long Khmer text, long emails); `mobile-native` covers phone quirks. |

`skills-lock.json` records each skill's source and hash.

Notes:

- **Impeccable's design bias.** It pushes "distinctive" design; AGENTS.md says
  the UI must be obvious and never clever for low-literacy users. Use its
  anti-pattern checks, not its "make it bolder" commands.
- **Impeccable downloads a binary.** On first use its launcher fetches an engine
  from `github.com/pbakaus/impeccable/releases` into a user cache and verifies
  it against the release's `.sha256` file before running it.
- **Vercel rules that don't fit.** "Title Case for headings" is English-only
  style; Khmer has no case, and English labels here follow sentence case.

## Updating or re-installing

```sh
# Update every project skill to its latest version
npx skills@latest update --project -y

# Re-install from scratch (what was run on 2026-10-04)
npx skills@latest add emilkowalski/skills --skill emil-design-eng review-animations break-ui mobile-native --agent claude-code --copy -y
npx skills@latest add pbakaus/impeccable --skill impeccable --agent claude-code --copy -y
curl -fsSL -o .claude/commands/web-interface-guidelines.md https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

`--copy` writes real files instead of symlinks, which OneDrive and Windows
handle badly. Commit the result so other machines get the same version.

Vercel's own installer (`curl -fsSL https://vercel.com/design/guidelines/install | bash`)
puts the command in `~/.claude/commands/`, which is per user and not in git.
The `curl -o` line above puts it in the project instead.

## Not installed, on purpose

- Emil Kowalski's other skills (`write-swift`, `animate-expo`, `prototype`,
  `pick-ui-library`, …): Swift, React Native, or adding libraries this app
  doesn't need. Add one with `--skill <name>` if it becomes useful.
- Anthropic's `frontend-design`: aimed at bold landing pages, not a
  government data-entry tool.
- Charts already have the built-in `dataviz` skill.
