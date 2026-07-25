# AGENTS.md

This repo's contributor rules for AI assistants live in [CLAUDE.md](CLAUDE.md). They are tool-agnostic:
read that file and follow it, whatever assistant you are.

Short version: `lib_bespok3d` is the workspace's shared-code home. It holds the `@bespok3d/contract` types
(the app-to-daemon wire shapes, declared once) and the gate detectors every repo runs. A detector change
here changes every repo's gate, so keep its own test green and do not weaken a real check. Run
`bash scripts/check.sh` and make it green (fix a real failure, never mute it), and keep every identifier
meaningful, nesting shallow, and em-dashes out.
