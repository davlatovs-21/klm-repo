# Архив источника — сайт КЛМ

Локальная копия публичного сайта заказчика. Снята **2026-08-05**.

- Источник: `https://xn--b1aekkfgciabim3h.xn--p1ai/` (punycode; кириллический домен «шинопровод.рф»)
- Стек источника: SPA на Vite + React + Supabase с серверным пререндером HTML
- Причина архива: страховка на случай недоступности сайта. Данные каталога в приложении
  берутся из `lib/klm-catalog.ts`, который собран по этому архиву.

## Что здесь

| Файл | Содержимое |
|---|---|
| `pages.tar.gz` | 537 страниц HTML как есть — весь публичный сайт (sitemap + маршруты из бандла) |
| `catalog.json` | 221 товар: `sku`, название, раздел, описание, таблица характеристик, FAQ, хлебные крошки |
| `categories.json` | 10 категорий каталога из `CollectionPage` / `ItemList` |
| `sitemap.xml` | Карта сайта на дату снятия (496 URL) |
| `urls.txt` | Итоговый список загруженных URL (496 из sitemap + 75 маршрутов из бандла) |
| `routes.txt` | 189 маршрутов, вынутых из JS-бандла — включая те, которых нет в sitemap |
| `frontend-bundle.tar.gz` | JS/CSS бандл сайта — первоисточник SEO-текстов, маршрутов и токенов темы |

Ассеты вынесены отдельно: логотип и иконки в `public/klm/`, 50 фотографий объектов
в `public/klm/objects/`.

## Не копировалось

Закрытые зоны по `robots.txt` и служебные маршруты CRM: `/admin*`, `/login`, `/signup`,
`/leads`, `/users`, `/seo*`, `/settings`, `/analytics`, `/api/`, `/rest/`, `/storage/`.

Маршруты `/klm-s`, `/buy`, `/video/*` и ещё 31 отдают 404 на сервере — это клиентские
редиректы SPA. Их канонические адреса (`/catalog/klm-r`, `/catalog/klm-t`, …) в архиве есть.

## Как обновить

```bash
curl -sS https://xn--b1aekkfgciabim3h.xn--p1ai/sitemap.xml -o sitemap.xml
grep -o '<loc>[^<]*</loc>' sitemap.xml | sed -e 's|<loc>||' -e 's|</loc>||' > urls.txt
node ../../scripts/mirror-klm.mjs      # urls.txt -> pages/
node ../../scripts/extract-klm.mjs     # pages/  -> site.json, catalog.json, categories.json
```

`site.json` (≈9 МБ: полный текст всех страниц) в репозиторий не кладётся — он
восстанавливается из `pages.tar.gz` вторым шагом.

## Связь с заказчиком

- ООО «КЛМ» / Главпроект, реестр Минпромторга №10728864, с 2006 года
- info@glavproekt.com · +7 (499) 444-70-05 · Пн–Пт 9:00–18:00 МСК
- Производство: Владимирская область · ISO 9001 · YouTube «Шинопровод ТВ»
