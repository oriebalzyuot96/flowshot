# Security

Flowshot reads a HAR file you point it at and writes a component next to an evidence file. It does not send the capture anywhere.

Redaction is best-effort. Authorization headers, cookies, and fields whose names look like secrets are dropped or replaced. Review `evidence.md` and `api.ts` before you share them.

Do not file issues that contain real tokens, cookies, or private captures. A minimal HAR with fake data is enough.
