# NotesSearch

Flowshot kept the application calls from a HAR you supplied. Static files were left out. Cookies, authorization headers, and secret-looking values were not copied.

Ignored 1 other request.

| # | Method | Path | Status | ms | Response |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/notes` | 200 | 84 | recorded |

## GET /api/notes

Query

| Name | Example |
| --- | --- |
| q | `design` |

Response shape

```ts
{ items: { id: number; title: string; updatedAt?: string }[] }
```

## Component

`NotesSearch` submits the captured fields and renders the result of `GET /api/notes`.

## Limits

- The component is a starting point grounded in the capture, not a visual copy of a screen.
- Replay does not send the original cookies or authorization header. Add your own session in the app that hosts the component.
- Use this on a flow you recorded yourself and are allowed to examine.

