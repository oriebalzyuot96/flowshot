# Flowshot

[English](../README.md)

سجّل حركة واحدة بالمتصفح. الأداة بتطلّع مكوّن، ومعه دليل لكل طلب صار أثناءها.

```bash
npm install
npm run build
node dist/cli.js build examples/notes-search.har --out examples/notes-search --name NotesSearch
```

مثال الملاحظات فيه كوكي وتوكن. الاتنين ما بيننسخوا للمخرجات. طلب `app.js` بينتجاهل. اللي بيبقى: `GET /api/notes?q=design`، ودالة typed، وفورم بحث بيعرض `items`.


![نظرة عامة على Flowshot: ملف HAR يدخل، فيحتفظ Flowshot باستدعاءات الواجهة ويزيل الأسرار، ثم يكتب ملفات الدليل ومكوّنًا مكتوب الأنواع.](img/flowshot-overview.svg)

## الملفات

| الملف | دوره |
| --- | --- |
| `evidence.md` | الطلبات اللي انحفظت، مع الحالة والوقت وشكل الرد |
| `flow.json` | نفس النتيجة بصيغة يقراها الوكيل |
| `api.ts` | دالة `fetch` لكل طلب |
| المكوّن | فورم ونتيجة: React أو Angular أو Svelte أو Astro |

المكوّن ما بينادي غير العناوين اللي كانت بالتسجيل. إذا حقل ناقص من أحد الصفوف، النوع بيعلمه اختياري.

## التسجيل

1. Chrome DevTools ثم Network.
2. اعمل الحركة اللي بدك تعيد بناءها، مرة واحدة.
3. كليك يمين على قائمة الطلبات ثم **Save all as HAR with content**.
4. شغّل Flowshot على الملف.

```bash
node dist/cli.js build ./my-flow.har --out ./generated --name ProjectSearch --framework angular
```

`--framework` هو `react` (الافتراضي) أو `angular` أو `svelte` أو `astro`.

## مع الوكيل

`flowshot mcp` بيفتح أداة واحدة: `build_flow_from_har`. التعليمات موجودة في `skills/flowshot/SKILL.md`.

النسخة الحالية بتقرأ HAR أنت صدّرته. تسجيل الشاشة، وتتبع Playwright، وربط لقطة الشاشة بنفس الجدول، جاين بعدين.

استخدمها على تدفق سجّلته بنفسك ومسموح لك تفحصه. الأداة ما بتبعت التسجيل لأي سيرفر.
