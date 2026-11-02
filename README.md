# RUN-EU Local Applications Tracker

A local-first dashboard for managing RUN-EU opportunities and applications. YAML files are the database and remain easy to edit, diff and commit with Git.

## Requirements

- Node.js 20+
- Yarn

## Run

```bash
yarn install
yarn build
yarn start
```

Open <http://127.0.0.1:4173>.

For development with automatic server restart:

```bash
yarn build
yarn dev
```

`yarn dev` watches and restarts the server. After changing browser code or styles, run `yarn build` to refresh the client build.

## Features

- Create, edit and delete programme/application records from the UI.
- Update application status, submission details, outcome and feedback.
- Add programme-specific questions with different question types.
- Append answer revisions and mark the exact submitted revision. Earlier revisions are preserved.
- Export each programme's questions and submitted answers as a Markdown archive from its application workspace.
- Maintain participation history independently from applications.
- Export participated/completed opportunities as Markdown or CSV.
- Maintain reusable answer-library entries.
- Search and filter applications; view deadlines and summary statistics.
- Changes are written immediately to YAML files.

## Structure

```text
run-eu-local-tracker/
├── data/
│   ├── applications/          # One YAML file per opportunity/application
│   ├── participation-history.yaml
│   ├── common-questions.yaml
│   └── answer-library.yaml
├── public/                    # Dashboard HTML and generated stylesheet input
├── src/client/                # Typed browser entry point and feature modules
│   └── features/              # Dashboard, application, and form features
├── src/server/                # Typed API, YAML persistence, and HTTP server
├── src/input.css              # Tailwind entry point and custom components
├── dist/                      # Generated browser build
├── dist-server/               # Generated server build
├── package.json
└── vite.config.ts             # Browser build configuration
```

## Data model

Each `data/applications/*.yaml` file stores its own programme metadata, application lifecycle, unique form questions and append-only answer revision history. Questions are not forced into a shared template: every programme can ask different things.

`participation-history.yaml` stores opportunities actually attended/completed. It is separate from applications so an accepted application is not automatically treated as a participation. The Markdown/CSV exports include only `participated` and `completed` entries.

`answer-library.yaml` stores reusable background material. It is reference material only; preserve exact submitted wording in each application's question history.

`common-questions.yaml` describes shared prompts such as previous RUN-EU participation.

## Adding opportunities

Use **Add opportunity** in the dashboard. The server creates a slugged YAML file under `data/applications/`. Alternatively, copy an existing YAML file, give it a unique filename and programme/application ID, then refresh the dashboard.

## Local security and backups

The server binds to `127.0.0.1` by default and is intended for local use. It has no authentication and should not be exposed to your LAN or the public internet without adding authentication, CSRF protection and appropriate access controls. The dashboard writes files directly, so use Git commits and backups to protect your data.

## Existing records

The initial St Patrick's Day, Food and Festivals and Entrepreneurship Festival records are pre-populated. Their programme details have `verify_before_submission` notes: confirm deadlines, dates, location, credits, eligibility and funding against the live RUN-EU pages and your institution before relying on them. The previous Dreaming of a Green Christmas participation record is also pre-populated; verify its exact period and awarded ECTS.
