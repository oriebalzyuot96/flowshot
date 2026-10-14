---
name: flowshot
description: Turn a HAR capture of one user flow into a component and an evidence file. Use when the user exported a HAR, asks to rebuild a screen from network traffic they recorded, or wants a component grounded in captured requests.
---

# Flowshot

Use a HAR the user already exported. Do not record or inspect an application they do not own and are not allowed to examine.

1. From a built checkout, run `node dist/cli.js build <file.har> --out <dir> --name <PascalName> --framework react|angular|svelte|astro`.
2. Read `evidence.md` and `flow.json` before changing the component.
3. Keep the generated endpoints. Do not add calls that are not in the evidence.
4. Cookies and authorization headers are removed on purpose. Ask how the host project authenticates before adding headers.
