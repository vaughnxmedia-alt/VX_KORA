# Upstream attribution

This directory is derived from **[ByteDance trae-agent](https://github.com/bytedance/trae-agent)** (MIT License).

## What was rebranded for KORA / JahknowsPR

- Python package: `trae_agent` → `kora_engineering_agent`
- PyPI-style name: `kora-engineering-agent`
- CLI entry point: `kora-eng-cli` (was `trae-cli`)
- Default config filenames: `kora_eng_config.yaml` / `kora_eng_config.json` (examples: `kora_eng_config.yaml.example`)
- YAML agent key: `kora_engineering_agent` (under `agents:`)
- Config env var for CLI: `KORA_ENG_CONFIG_FILE` (replacing `TRAE_CONFIG_FILE`)
- User data dir: `~/.kora-engineering-agent`
- Main agent class: `KoraEngineeringAgent`

Original **copyright notices** in source files are retained where present.

## Git remotes (fork workflow)

After cloning, the vendor tree may still use `origin` pointing at ByteDance. For **your** GitHub fork as the default push target:

```bash
cd KORA/services/kora-engineering-agent
git remote rename origin upstream
git remote add origin https://github.com/<YOUR_GITHUB_USER_OR_ORG>/kora-engineering-agent.git
git push -u origin main
```

Create the empty repo on GitHub first (**New repository** → name e.g. `kora-engineering-agent`), then run the commands above. Use SSH if you prefer: `git@github.com:<USER>/kora-engineering-agent.git`.

If you use [GitHub CLI](https://cli.github.com/): `gh repo create <name> --private --source=. --remote=origin --push` from this directory (after `git remote rename origin upstream` if needed).

**Published fork (example):** [github.com/vaughnxmedia-alt/kora-engineering-agent](https://github.com/vaughnxmedia-alt/kora-engineering-agent)

If the repo was created with `git clone --depth 1`, a push to a new remote can fail until history is complete. Run `git fetch upstream --unshallow` (or `git fetch --unshallow` from the relevant remote), then push again.

## Staying current with upstream

1. Ensure **upstream** points at ByteDance:  
   `git remote add upstream https://github.com/bytedance/trae-agent.git`  
   (Skip if you already renamed the old `origin` to `upstream`.)
2. Fetch and merge or cherry-pick:  
   `git fetch upstream` then merge `upstream/main` into your branch.
3. Re-apply KORA renames if upstream introduces new `trae_*` paths or branding.

## Academic citation

If you cite the underlying work, use the paper referenced in [README.md](README.md) (Trae Agent, arXiv:2507.23370).
