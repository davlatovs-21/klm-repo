# Repository synchronization hook

The `post-commit` hook pushes commits made on `main` to both configured remotes:

- `origin` — the primary `komilovsg/online-store-klm` repository;
- `backup` — the mirror `davlatovs-21/online-store-klm` repository.

Enable the tracked hooks for a fresh clone with:

```bash
git config core.hooksPath .githooks
```
