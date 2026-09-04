# Git-хуки проекта

Хуки не подключаются автоматически: Git не исполняет `.githooks/` сам.
После клонирования репозитория выполнить один раз:

```sh
git config core.hooksPath .githooks
```

## pre-push

Гоняет `npm run verify` — TypeScript, ESLint, тесты и production-сборку Next.js,
то есть ровно то, что делает Vercel. Сломанный коммит до Vercel не доедет.

Разово пропустить: `git push --no-verify`.

Более глубокая проверка, уже пайплайном самого Vercel (нужен `vercel link`):

```sh
npx vercel build
```
