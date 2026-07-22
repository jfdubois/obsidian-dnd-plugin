# 07 — Workspace Requirements and Bootstrap

This document defines what must be prepared before Phase 0 implementation begins.

## 1. Host requirements

Recommended development host:

- Linux workstation or VM; Fedora/Ubuntu are suitable.
- Git.
- Node.js 22 pinned for this project.
- npm included with Node.
- Docker Engine and Docker Compose v2.
- Obsidian desktop for primary plugin development.
- Android Obsidian device or emulator for mobile validation.
- VS Code, VSCodium, or another TypeScript-capable editor.
- Local Qwen3.6-27B-Coder access through the user's existing inference workflow.

The official Obsidian sample currently states Node.js 18 or newer and uses a strict TypeScript/esbuild toolchain. This project deliberately pins Node 22 to keep all contributors and the local LLM on one repeatable toolchain.

## 2. Filesystem layout

Recommended root:

```text
~/dev/obsidian-dnd-character/
├── repository/                 # project Git repository
├── external/
│   └── 5etools-src/            # local source clone; not committed
├── runtime/
│   ├── catalog-output/         # generated revisions
│   └── docker-data/
└── test-vault/                 # dedicated Obsidian development vault
```

Do not develop directly in a production vault.

## 3. Obsidian test vault

Create a dedicated vault:

```text
test-vault/
├── .obsidian/
│   └── plugins/
│       └── obsidian-dnd-character/
└── DnD Characters/
```

The development build may output/copy these release files to the plugin folder:

- `main.js`;
- `manifest.json`;
- `styles.css`.

Keep test characters and migration fixtures under version-controlled project fixtures where appropriate, not only in the vault.

## 4. Repository prerequisites

Before asking the LLM to implement Phase 1, place this project pack in the repository and prepare:

```text
AGENTS.md
PROJECT_CONTEXT.md
CONTEXT_INDEX.md
docs/
prompts/
references/
```

Initialize Git and create branches:

```bash
git init
git checkout -b main
git checkout -b dev
```

If the remote repository already exists, clone it and create `dev` from `main` instead.

## 5. Pinned reference acquisition

### Obsidian

Save immutable copies of:

- official `obsidian.d.ts`;
- official sample plugin `main.ts`;
- `package.json`;
- `manifest.json`;
- `tsconfig.json`;
- `esbuild.config.mjs`;
- relevant README/release guidance.

Record upstream commit/hash and retrieval date.

### D&D Beyond fixture

Save the referenced character response under `references/dndbeyond/`. Do not query it from production code.

### 5eTools source

Clone the configured source repository under `external/5etools-src` and record the exact commit used for every catalog build.

Example administrative workflow:

```bash
cd ~/dev/obsidian-dnd-character/external
git clone https://github.com/5etools-mirror-3/5etools-src.git
cd 5etools-src
git rev-parse HEAD
```

Review the repository's content and distribution terms before publishing any generated catalog outside a private environment.

## 6. Network and Docker preparation

Choose a catalog URL strategy.

### Desktop-only development

```text
http://127.0.0.1:8080/catalog/v1/
```

### Desktop and mobile on LAN

```text
http://<docker-host-lan-ip>:8080/catalog/v1/
```

### Remote/mobile use

Use HTTPS through a trusted reverse proxy or access the LAN service through VPN. Avoid exposing an unauthenticated private content service directly to the Internet.

Ensure firewall rules allow only intended clients.

## 7. Environment variables

Prepare a root `.env.example` without secrets:

```dotenv
FIVEETOOLS_SOURCE_PATH=/absolute/path/to/external/5etools-src
CATALOG_OUTPUT_PATH=/absolute/path/to/runtime/catalog-output
CATALOG_PORT=8080
CATALOG_BIND_ADDRESS=0.0.0.0
OBSIDIAN_TEST_VAULT_PATH=/absolute/path/to/test-vault
```

Real `.env` remains ignored by Git.

## 8. LLM context preparation

The local LLM should have access to:

- repository files;
- the exact current task;
- command execution in the repository;
- targeted reference files;
- targeted raw 5eTools fixtures only when needed.

Avoid loading the entire 5eTools repository into one prompt. Use search commands to locate representative records and save minimal fixtures under tests.

Configure the LLM workflow to:

- respect `AGENTS.md`;
- perform one roadmap task per run;
- run commands rather than claim they were run;
- update status only after passing checks;
- stop after the task report.

## 9. Recommended local commands after workspace creation

The exact scripts will be created in Phase 1, but the target operator experience is:

```bash
npm install
npm run check
npm run test
npm run build
npm run dev:plugin
npm run build:catalog
npm run docker:catalog
```

## 10. Backup and recovery

Before development begins:

- ensure the Git remote is private unless public release is intended;
- back up the test vault if it contains important manual fixtures;
- retain generated catalog revisions used by characters;
- never rely on `current` as the only stored catalog revision;
- commit documentation and test fixtures frequently.

## 11. Pre-development checklist

- [ ] Project pack copied into repository.
- [ ] Git remote and `main`/`dev` branches ready.
- [ ] Node 22 and npm verified.
- [ ] Docker and Compose verified.
- [ ] Dedicated Obsidian test vault created.
- [ ] Plugin folder created in test vault.
- [ ] Obsidian references pinned.
- [ ] D&D Beyond fixture pinned.
- [ ] 5eTools clone present and commit recorded.
- [ ] Catalog network URL chosen for desktop/mobile.
- [ ] `.env` paths prepared.
- [ ] Local LLM can read/write repo and run shell commands.
- [ ] Content governance decision accepted.
