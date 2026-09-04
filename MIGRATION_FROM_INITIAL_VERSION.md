# КЛМ Трасса: полное описание текущей версии и перенос из первой версии

> Назначение документа: передать этот файл разработчику или ИИ-агенту, у которого есть самая первая версия проекта, скачанная из GitHub-репозитория `komilovsg` / `davlatovs-21/klm-repo`, чтобы он смог воспроизвести текущее состояние проекта.
>
> Контрольная точка документа: ветка `main`, коммит `1236dc2` (`fix: generate factory KLM-S articles`), 2 сентября 2026 года.
>
> Первая версия проекта: коммит `0e05fd75354490dcd2c32a16ceefe763ddce87c0` (`Initial commit from Create Next App`).

## 1. Что это за проект

«КЛМ Трасса» — инженерная веб-платформа для подбора, расчёта и проектирования шинопроводных систем КЛМ. Пользователь задаёт нагрузку и условия прокладки либо рисует трассу участками. Приложение:

- рассчитывает ток нагрузки;
- применяет коэффициенты температуры, способа монтажа, группировки и высоты;
- выбирает серию, материал и ближайший допустимый номинал шинопровода;
- считает падение напряжения, потери, токи короткого замыкания, тепловое расширение, компенсаторы и подвесы;
- раскладывает геометрию трассы на прямые секции, углы, отводы, проходки и другие элементы;
- проверяет конфигурацию и показывает происхождение каждого результата;
- формирует спецификацию и заводские коды заказа;
- сравнивает шинопровод с кабельной линией;
- преобразует спецификации шинопроводов и кабельных лотков других производителей в аналоги КЛМ;
- принимает публичные заявки и поддерживает встраиваемый дилерский виджет;
- хранит пользователей, организации, проекты, конфигурации, версии и аудит в PostgreSQL.

Это не интернет-магазин и не готовая ERP. Ценообразование, коммерческие предложения, заказы, документы и интеграции с 1С/CRM обозначены как следующие этапы. Полнота результата также зависит от переданных заводом справочников и прайса.

## 2. Технологический стек

| Часть | Технология |
|---|---|
| Web framework | Next.js `16.3.0`, App Router, Turbopack |
| UI | React `19.2.8`, React DOM `19.2.8`, TypeScript |
| Стили | Tailwind CSS 4 через `@tailwindcss/postcss`, собственные глобальные стили |
| База | PostgreSQL |
| ORM и миграции | Drizzle ORM `0.45.x`, Drizzle Kit `0.31.x` |
| Пароли | PBKDF2-SHA-256 через стандартный Web Crypto API |
| Импорт таблиц | `xlsx` |
| PDF/OCR | `pdfjs-dist`, `tesseract.js`, локальные OCR worker/core/language assets |
| Тесты | Node test runner через `tsx --test` |

Основные конфигурационные файлы:

- [`package.json`](package.json) — зависимости и команды;
- [`package-lock.json`](package-lock.json) — зафиксированные версии зависимостей;
- [`tsconfig.json`](tsconfig.json) — строгий TypeScript и alias `@/*`;
- [`next.config.ts`](next.config.ts) — конфигурация Next.js;
- [`postcss.config.mjs`](postcss.config.mjs) — Tailwind/PostCSS;
- [`eslint.config.mjs`](eslint.config.mjs) — ESLint;
- [`drizzle.config.ts`](drizzle.config.ts) — конфигурация миграций;
- [`proxy.ts`](proxy.ts) — защита маршрутов в Next.js 16;
- [`AGENTS.md`](AGENTS.md) — важное правило проекта: перед изменением Next.js-кода читать документацию установленной версии из `node_modules/next/dist/docs/`.

## 3. Самый надёжный способ переноса

Если старая копия действительно происходит от первого коммита этого же репозитория, не нужно вручную переписывать 235 изменённых файлов. Следует подтянуть текущую ветку Git.

### Вариант A — обновить старую ветку до текущей

Перед началом сохранить локальные изменения отдельным коммитом или сделать копию каталога. Затем:

```bash
git remote -v
git remote add upstream https://github.com/davlatovs-21/klm-repo.git
git fetch upstream
git switch -c backup-before-klm-upgrade
git switch <рабочая-ветка>
git merge upstream/main
npm install
```

Если `upstream` уже существует, команду `git remote add` пропустить. Конфликты нельзя разрешать слепой заменой: сохранить пользовательские изменения старого проекта и сопоставить их с картой файлов ниже.

### Вариант B — применить коммиты по порядку

Этот вариант удобен, если нужно видеть каждый функциональный этап отдельно:

```text
2736d7c  концепт-прототип панели подбора КОМ
360fc03  выбор шинопровода на данных КЛМ
34451ef  исправления страниц
08e3604  исправления расчётов КОМ и шинопровода
ab77050  расчётное ядро: ΔU, потери, КЗ, расширение, подвесы
91264c9  пакет запроса исходных данных «Этап 0»
afe6f18  трассировка расчёта и сравнение с кабелем
6c91fbc  публичный калькулятор, заявки и виджет
486a5a5  PostgreSQL, схема и миграции; заявка становится проектом
e97a0c7  вход, роли, DAL, аудит и RLS
b503753  обновление Next.js до 16.3.0
88cb2e7  конструктор трассы и спецификация из геометрии
7f50870  интерактивный план трассы
84cf6af  undo/redo, включая Ctrl+Z
d1873f2  версии трассы и серверное автосохранение
39aa880  правила разработки Next.js в AGENTS.md
fc8d9de  разделение меню по аудиториям
8b2b7ea  официальный каталог KLM V3: R, X, размеры, массы, нормы
fe703ba  расширенное README
f22b218  исправление .gitignore
bd30596  раздел конвертера спецификаций
bfbc380  панель продаж и материалы по кабельным системам
2706671  конвертер спецификации кабельных лотков KLM
bd4a4c0  ссылка на лотки KLM в навигации
5304882  публичные инструменты лотков и каталоги производителей
0a0d902  сопоставление каталогов EAE и Makinteh
620847c  подбор лотков KLM по характеристикам производителя
9d1c403  конвертация спецификаций конкурентов
995de3f  допустимые полюса и коды изделий KLM
1236dc2  заводские артикулы KLM-S
```

Пример применения после `git fetch upstream`:

```bash
git cherry-pick 2736d7c^..1236dc2
```

Этот диапазон предполагает общую историю с `0e05fd7`. При конфликтах безопаснее остановить cherry-pick и выполнить перенос блоками по разделу 10.

### Вариант C — ручной перенос

Копировать только исходники и исходные данные. Не переносить:

- `node_modules/` — восстановить через `npm install`;
- `.next/` — результат локальной сборки;
- `tmp/` — временные изображения/PDF;
- `demo-hosting/` — собранный демонстрационный артефакт, а не первичный исходный код;
- `.env.local` — содержит локальные секреты и адрес базы;
- `tsconfig.tsbuildinfo` — кэш TypeScript.

## 4. URL-маршруты и связанные файлы

Группа `(site)` — route group Next.js и не входит в URL.

| URL | Назначение | Страница | Главный компонент/ядро |
|---|---|---|---|
| `/` | Лендинг и описание продукта | [`app/(site)/page.tsx`](<app/(site)/page.tsx>) | `components/ui.tsx`, `Illustrations`, `CodeAnatomy` |
| `/demo` | Демо конфигуратора КОМ и кода заказа | [`app/(site)/demo/page.tsx`](<app/(site)/demo/page.tsx>) | [`components/Configurator.tsx`](components/Configurator.tsx), `lib/core/engine.ts` |
| `/podbor` | Помощник выбора шинопровода | [`app/(site)/podbor/page.tsx`](<app/(site)/podbor/page.tsx>) | [`components/BusbarSelector.tsx`](components/BusbarSelector.tsx), `lib/core/select-busbar.ts` |
| `/calc` | Публичный четырёхшаговый калькулятор без регистрации | [`app/(site)/calc/page.tsx`](<app/(site)/calc/page.tsx>) | [`components/CalcWizard.tsx`](components/CalcWizard.tsx), `lib/core/select-busbar.ts`, `lib/core/calc-url.ts` |
| `/sravnenie` | Шинопровод против кабеля | [`app/(site)/sravnenie/page.tsx`](<app/(site)/sravnenie/page.tsx>) | [`components/CableCompare.tsx`](components/CableCompare.tsx), `lib/core/cable.ts` |
| `/app/route` | Визуальный проектировщик трассы | [`app/(site)/app/route/page.tsx`](<app/(site)/app/route/page.tsx>) | [`components/RouteBuilder.tsx`](components/RouteBuilder.tsx), `RoutePlan.tsx`, `lib/core/route.ts` |
| `/app/converter` | Импорт и преобразование спецификаций кабельных лотков | [`app/(site)/app/converter/page.tsx`](<app/(site)/app/converter/page.tsx>) | [`components/TraySpecificationConverter.tsx`](components/TraySpecificationConverter.tsx), `lib/core/tray-converter.ts` |
| `/app/busbar-converter` | Преобразование спецификаций шинопроводов конкурентов в KLM | [`app/(site)/app/busbar-converter/page.tsx`](<app/(site)/app/busbar-converter/page.tsx>) | `TraySpecificationConverter` в режиме `busbar`, `lib/core/busbar-spec-converter.ts` |
| `/app` | Кабинет пользователя и проекты | [`app/(site)/app/page.tsx`](<app/(site)/app/page.tsx>) | `lib/dal/index.ts`, `SystemHealth`, `DashboardTabs` |
| `/login` | Вход | [`app/(site)/login/page.tsx`](<app/(site)/login/page.tsx>) | [`components/AuthForm.tsx`](components/AuthForm.tsx), `app/actions/auth.ts` |
| `/register` | Регистрация | [`app/(site)/register/page.tsx`](<app/(site)/register/page.tsx>) | `AuthForm`, `app/actions/auth.ts` |
| `/widget` | Независимый iframe-калькулятор дилера | [`app/widget/page.tsx`](app/widget/page.tsx) | `CalcWizard`; не использует общий site layout |
| `/scope` | Объём, этапы, сроки и критерии приёмки | [`app/(site)/scope/page.tsx`](<app/(site)/scope/page.tsx>) | статическая страница |
| `/data` | Какие исходные данные нужны от КЛМ | [`app/(site)/data/page.tsx`](<app/(site)/data/page.tsx>) | `data/etap-0/*` |
| `/policy` | Заготовка политики обработки персональных данных | [`app/(site)/policy/page.tsx`](<app/(site)/policy/page.tsx>) | статическая страница |
| `/api/health` | Проверка подключения PostgreSQL | [`app/api/health/route.ts`](app/api/health/route.ts) | `lib/db/index.ts`; `200 ok` или `503 degraded` |

Общие layout-файлы:

- [`app/layout.tsx`](app/layout.tsx) — корневой HTML, metadata, шрифты и глобальные стили;
- [`app/(site)/layout.tsx`](<app/(site)/layout.tsx>) — общая шапка, навигация и подвал публичного сайта;
- [`app/(site)/app/layout.tsx`](<app/(site)/app/layout.tsx>) — вкладки инженерного кабинета;
- [`app/globals.css`](app/globals.css) — дизайн-система, адаптивность, печать и анимации.

## 5. Расчётное ядро

Ядро находится в [`lib/core/`](lib/core). Оно отделено от React и базы: функции получают исходные данные и справочник, затем возвращают результат и список проверок. Внутри расчётов нельзя использовать сеть, базу или нестабильные значения вроде `Date.now()`.

### `lib/core/klm-catalog.ts`

Единый справочник изделий КЛМ:

- серии KLM-S, KLM-R, троллейные и средневольтные решения;
- назначение серии и допустимые напряжения;
- ряды номинальных токов;
- алюминий/медь, IP55/IP68;
- диапазоны коробок отбора Plug-in и Bolt-on;
- допустимые полюса и коды проводников;
- коды номиналов и секций;
- нестандартные длины и монтажный припуск;
- нормы установки компенсаторов;
- размеры горизонтальных/вертикальных углов;
- огнестойкая проходка;
- типы объектов и импортные аналоги;
- реквизиты компании и ссылки на исходный сайт.

### `lib/core/klm-profile.ts`

Оцифрованные таблицы официального каталога KLM V3 от 24.03.2026:

- сечения проводников;
- активное `R`, реактивное `X` и полное `Z` сопротивление;
- температурные значения 20/35/40 °C;
- габариты IP55/IP68;
- масса погонного метра;
- выбор профиля по материалу и номиналу.

### `lib/core/select-busbar.ts`

Главный алгоритм подбора:

1. Получает мощность или ток, напряжение, `cos φ`, КПД и запас.
2. Рассчитывает рабочий ток.
3. Определяет коэффициент температуры по таблице derating.
4. Применяет коэффициенты монтажа, группировки и высоты.
5. Выбирает серию по назначению трассы.
6. Выбирает ближайший номинал из каталога.
7. Проверяет материал, IP, доступность отводов и резерв.
8. По каталожным `R/X` рассчитывает падение напряжения.
9. Формирует проверки уровней `error`, `warn`, `info` и трассировку вычислений.

### `lib/core/electrical.ts`

Инженерные функции:

- трёхфазное падение напряжения;
- активные потери мощности и стоимость потерь;
- ожидаемый ток КЗ и проверка `Icw/Ipk`;
- тепловое удлинение;
- число и положение компенсаторов;
- расчёт подвесов и проверка шага крепления.

### `lib/core/route.ts`

Модель геометрии трассы:

- направления `x+`, `x-`, `y+`, `y-`, `up`, `down`;
- прямые сегменты, точки отбора, ввод питания;
- пересечения стены, противопожарной преграды и деформационного шва;
- определение угла между последовательными участками;
- разбиение длины на стандартные/нестандартные секции;
- автоматическое добавление соединений, заглушек, вводов, углов, компенсаторов и проходок;
- формирование BOM/спецификации и диагностик;
- перевод маршрута в координаты плана;
- привязка точек к сетке и обратный расчёт расстояния по координате.

### `lib/core/engine.ts`

Конфигуратор КОМ:

- десять правил совместимости;
- проверка серии, номинала магистрали, тока отвода, IP и полюсов;
- выбор корпуса и аппарата защиты;
- блокировка недопустимого заказа;
- формирование и расшифровка кода заказа;
- сериализация конфигурации в URL;
- демонстрационные пресеты, включая ошибочные сценарии.

### Другие модули ядра

| Файл | Ответственность |
|---|---|
| [`lib/core/cable.ts`](lib/core/cable.ts) | Подбор кабельной альтернативы по ПУЭ, потери, масса металла и сравнение жизненного цикла |
| [`lib/core/calc-url.ts`](lib/core/calc-url.ts) | Валидация и сериализация параметров публичного расчёта в ссылку |
| [`lib/core/tray-converter.ts`](lib/core/tray-converter.ts) | Чтение табличных строк, распознавание производителя и преобразование кабельных лотков в KLM |
| [`lib/core/tray-catalog-index.json`](lib/core/tray-catalog-index.json) | Локальный индекс товаров/характеристик производителей лотков |
| [`lib/core/busbar-spec-converter.ts`](lib/core/busbar-spec-converter.ts) | Классификация строк спецификации шинопровода и генерация аналога/артикула KLM-S |
| [`lib/core/catalog.ts`](lib/core/catalog.ts) | Адаптер каталога для конфигуратора КОМ |

## 6. Компоненты интерфейса

| Файл | Что делает |
|---|---|
| [`components/CalcWizard.tsx`](components/CalcWizard.tsx) | Публичный мастер расчёта: объект → нагрузка → условия → результат; ссылка и форма заявки |
| [`components/BusbarSelector.tsx`](components/BusbarSelector.tsx) | Расширенная инженерная панель выбора серии/номинала с трассировкой |
| [`components/Configurator.tsx`](components/Configurator.tsx) | Пошаговая конфигурация КОМ, проверки, автоисправления, код заказа и печать |
| [`components/RouteBuilder.tsx`](components/RouteBuilder.tsx) | Редактор участков трассы, спецификация, undo/redo, автосохранение и версии |
| [`components/RoutePlan.tsx`](components/RoutePlan.tsx) | Интерактивный SVG-план: рисование кликами и перемещение точек отбора |
| [`components/TraySpecificationConverter.tsx`](components/TraySpecificationConverter.tsx) | Импорт XLSX/XLS/CSV/PDF/изображений, OCR и экспорт результата |
| [`components/CableCompare.tsx`](components/CableCompare.tsx) | UI сравнения шинопровода и кабеля |
| [`components/LeadForm.tsx`](components/LeadForm.tsx) | Валидация и отправка заявки через server action |
| [`components/AuthForm.tsx`](components/AuthForm.tsx) | Формы входа и регистрации |
| [`components/SystemHealth.tsx`](components/SystemHealth.tsx) | Отображение состояния базы через `/api/health` |
| [`components/DashboardTabs.tsx`](components/DashboardTabs.tsx) | Навигация инженерного раздела |
| [`components/MobileNav.tsx`](components/MobileNav.tsx) | Мобильное меню |
| [`components/CodeAnatomy.tsx`](components/CodeAnatomy.tsx) | Визуальная расшифровка кода заказа |
| [`components/Illustrations.tsx`](components/Illustrations.tsx) | Собственные SVG-схемы шинопровода и процесса |
| [`components/icons.tsx`](components/icons.tsx) | Набор inline SVG-иконок без внешней UI-библиотеки |
| [`components/ui.tsx`](components/ui.tsx) | Общие `Section`, `Head`, `Row`, `Card`, `Btn`, `PageHero` |

## 7. Серверные действия, заявки и состояние

### Server Actions

- [`app/actions/lead.ts`](app/actions/lead.ts) — принимает форму заявки, валидирует поля, учитывает источник `calc/widget`, UTM и `dealerRef`, сохраняет проект через репозиторий;
- [`app/actions/auth.ts`](app/actions/auth.ts) — регистрация, вход, выход и определение tenant по домену;
- [`app/actions/config.ts`](app/actions/config.ts) — сохранить трассу, получить версии и восстановить выбранную версию.

### Вспомогательная логика

- [`lib/leads.ts`](lib/leads.ts) — схема и нормализация входной заявки;
- [`lib/calc-params.ts`](lib/calc-params.ts) — типы/параметры калькулятора;
- [`lib/history.ts`](lib/history.ts) — неизменяемая история undo/redo с ограничением глубины;
- [`lib/client/pdf-specification.ts`](lib/client/pdf-specification.ts) — клиентское извлечение строк спецификации из PDF.

## 8. PostgreSQL, авторизация и права

### Переменные окружения

Создать `.env.local` на основе [`.env.example`](.env.example):

```dotenv
DATABASE_URL=postgresql://localhost:5432/klm_dev
DATABASE_POOL_MAX=10
SESSION_SECRET=случайная-строка-не-короче-32-символов
```

`.env.local` не коммитить. Для production база с персональными данными должна размещаться с учётом требований 152-ФЗ.

### Схема

Схема описана в [`lib/db/schema.ts`](lib/db/schema.ts):

| Таблица | Назначение |
|---|---|
| `tenants` | white-label tenant, домен, бренд, локаль и валюта |
| `organizations` | клиент, дилер или внутренняя организация |
| `users` | пользователь, Argon2id-хеш, настройки, блокировка входа, 2FA-поля |
| `memberships` | роль пользователя в организации |
| `sessions` | отзывные серверные сессии; в базе хранится хеш токена |
| `invites` | одноразовые приглашения сроком 72 часа |
| `projects` | заявка/проект, контакты, статус, источник, UTM и дилер |
| `configurations` | конфигурация проекта и блокировка редактирования |
| `config_versions` | версии входа, результата, трассы, BOM и цены в JSON snapshots |
| `audit_log` | append-only аудит бизнес-действий |
| `calc_log` | обезличенный журнал публичных расчётов |

Enums: `role`, `org_type`, `project_status`, `duty`, `source`.

Миграции применять строго по порядку:

1. [`drizzle/0000_init.sql`](drizzle/0000_init.sql) — базовая схема;
2. [`drizzle/0001_rls_and_append_only.sql`](drizzle/0001_rls_and_append_only.sql) — Row Level Security и запрет изменения журналов;
3. [`drizzle/0002_config_input_optional.sql`](drizzle/0002_config_input_optional.sql) — разрешает конфигурации трассы без электрического input.

`drizzle/meta/` нужно переносить вместе с SQL: это журнал Drizzle, а не временные файлы.

### Слои доступа

- [`lib/db/client.ts`](lib/db/client.ts) — соединение и pool;
- [`lib/db/index.ts`](lib/db/index.ts) — публичный экспорт слоя БД;
- [`lib/db/leads-repo.ts`](lib/db/leads-repo.ts) — запись публичной заявки как проекта;
- [`lib/dal/index.ts`](lib/dal/index.ts) — серверная проверка текущей сессии и контекста доступа;
- [`lib/dal/permissions.ts`](lib/dal/permissions.ts) — матрица ролей;
- [`lib/dal/route.ts`](lib/dal/route.ts) — версии конфигурации трассы;
- [`lib/auth/password.ts`](lib/auth/password.ts) — версионированный PBKDF2-SHA-256 через Web Crypto; без native addons;
- [`lib/auth/token.ts`](lib/auth/token.ts) — подпись/проверка токена;
- [`lib/auth/session.ts`](lib/auth/session.ts) — cookie и серверная сессия;
- [`lib/auth/login.ts`](lib/auth/login.ts) — регистрация/аутентификация и блокировка перебора;
- [`lib/audit/index.ts`](lib/audit/index.ts) — запись аудита;
- [`lib/audit/mask.ts`](lib/audit/mask.ts) — маскирование чувствительных значений.

[`proxy.ts`](proxy.ts) выполняет только быструю проверку подписи cookie `klm_session`. Полная проверка срока, отзыва, пользователя и прав всегда должна оставаться в DAL. Публичными внутри `/app` оставлены `/app/converter`, `/app/busbar-converter` и `/app/route`; остальной `/app` требует вход.

## 9. Каталоги и исходные данные

Эти файлы функционально важны и должны переноситься вместе с кодом.

| Каталог | Содержание |
|---|---|
| [`data/klm-catalog/`](data/klm-catalog) | Официальный 27-страничный каталог шинопровода KLM V3 и описание оцифровки |
| [`data/klm-source/`](data/klm-source) | Локальный снимок публичного сайта: каталог JSON, категории, sitemap, routes и архивы страниц |
| [`data/etap-0/`](data/etap-0) | Шаблоны запроса номенклатуры, R/X, derating, геометрии, прайса и эталонной спецификации |
| [`data/busbar-catalogs/`](data/busbar-catalogs) | PDF-каталоги DKC, EAE, Legrand, PitON, Schneider и Siemens для сопоставления |
| [`Лоток/`](Лоток) | Каталоги кабеленесущих систем DKC, EAE, EKF, IEK, Makinteh, OSTEC и Промрукав |
| [`public/ocr/`](public/ocr) | Локальные Tesseract worker/core и языки `rus`/`eng`; необходимы для OCR без CDN |
| [`public/klm/`](public/klm) | Логотипы, favicons и фотографии объектов |
| [`assets/readme/`](assets/readme) | SVG-схемы для README |

При расхождении публичного сайта и официального каталога V3 приоритет имеет каталог V3, а расхождение должно оставаться явно помеченным в исходнике.

Скрипты подготовки данных:

- [`scripts/mirror-klm.mjs`](scripts/mirror-klm.mjs) — зеркалирование страниц сайта;
- [`scripts/extract-klm.mjs`](scripts/extract-klm.mjs) — извлечение данных KLM;
- [`scripts/make-etap0.ts`](scripts/make-etap0.ts) — формирование пакета Этапа 0;
- [`scripts/scrape-makinteh-trays.cjs`](scripts/scrape-makinteh-trays.cjs) — сбор каталога Makinteh;
- [`scripts/build-tray-catalog-index.cjs`](scripts/build-tray-catalog-index.cjs) — пересборка `tray-catalog-index.json`.

## 10. Пошаговый ручной перенос по функциональным блокам

Если Git-слияние невозможно, переносить в таком порядке. После каждого блока запускать тесты и сборку.

### Шаг 1 — каркас и зависимости

Заменить `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `next.config.ts`. Установить зависимости. Перенести `app/layout.tsx`, `app/globals.css`, `app/(site)/layout.tsx`, `components/ui.tsx`, `components/icons.tsx`, `components/MobileNav.tsx`.

### Шаг 2 — справочник и подбор

Перенести `lib/core/klm-catalog.ts`, `klm-profile.ts`, `catalog.ts`, `select-busbar.ts`, `electrical.ts`; затем `BusbarSelector.tsx`, `/podbor`, `/calc` и `CalcWizard.tsx`. Перенести `data/klm-catalog`, `data/klm-source`, `public/klm`.

### Шаг 3 — КОМ

Перенести `lib/core/engine.ts`, `Configurator.tsx`, `CodeAnatomy.tsx`, `Illustrations.tsx`, страницу `/demo` и их тесты.

### Шаг 4 — сравнение с кабелем

Перенести `lib/core/cable.ts`, `CableCompare.tsx` и `/sravnenie`.

### Шаг 5 — заявки и widget

Перенести `lib/calc-params.ts`, `lib/core/calc-url.ts`, `lib/leads.ts`, `LeadForm.tsx`, `app/actions/lead.ts`, `/widget`, `/policy`.

### Шаг 6 — база и безопасность

Перенести `drizzle.config.ts`, `.env.example`, весь `drizzle/`, `lib/db/`, `lib/auth/`, `lib/dal/`, `lib/audit/`, `proxy.ts`, `AuthForm.tsx`, `/login`, `/register`, `/app`, `/api/health`. Создать базу и применить миграции.

### Шаг 7 — конструктор трассы

Перенести `lib/core/route.ts`, `lib/history.ts`, `RouteBuilder.tsx`, `RoutePlan.tsx`, `/app/route`, `app/actions/config.ts`, `lib/dal/route.ts` и миграцию `0002`.

### Шаг 8 — конвертеры спецификаций

Перенести `TraySpecificationConverter.tsx`, `lib/core/tray-converter.ts`, `lib/core/busbar-spec-converter.ts`, `lib/client/pdf-specification.ts`, `public/ocr`, каталоги `data/busbar-catalogs` и `Лоток`, страницы `/app/converter` и `/app/busbar-converter`.

### Шаг 9 — информационные страницы и ассеты

Перенести `/`, `/scope`, `/data`, README, `assets/readme`, иконки приложения и все оставшиеся статические файлы из `public`.

## 11. Установка и запуск

Требования: актуальный Node.js, npm и PostgreSQL.

```bash
npm install
cp .env.example .env.local
createdb klm_dev
npm run db:migrate
npm run db:seed
npm run dev
```

На Windows PowerShell с запрещённым выполнением `npm.ps1` использовать `.cmd`, не меняя Execution Policy:

```powershell
npm.cmd install
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

По умолчанию приложение открывается на `http://localhost:3000`. Проверка БД: `http://localhost:3000/api/health`.

Доступные npm-команды:

| Команда | Назначение |
|---|---|
| `npm run dev` | dev-сервер Next.js |
| `npm run build` | production-сборка |
| `npm run start` | запуск production-сборки |
| `npm run lint` | ESLint |
| `npm test` | тесты ядра, заявок, auth и истории без БД |
| `npm run test:db` | последовательные интеграционные тесты против PostgreSQL |
| `npm run db:generate` | создать Drizzle migration из изменения схемы |
| `npm run db:migrate` | применить миграции |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | создать tenant, организацию и администратора |
| `npm run catalog:index` | пересобрать индекс кабельных лотков |
| `npm run catalog:makinteh` | обновить Makinteh и пересобрать индекс |

## 12. Тесты и критерии готовности после переноса

Тестовые файлы должны переноситься вместе с реализацией:

- `lib/core/select-busbar.test.ts` — подбор и коэффициенты;
- `lib/core/electrical.test.ts` — электрические расчёты;
- `lib/core/engine.test.ts` — правила КОМ и код заказа;
- `lib/core/route.test.ts` — геометрия и BOM;
- `lib/core/cable.test.ts` — кабельная альтернатива;
- `lib/core/calc-url.test.ts` — ссылки калькулятора;
- `lib/core/tray-converter.test.ts` — конвертер лотков;
- `lib/core/busbar-spec-converter.test.ts` — конвертер шинопроводов;
- `lib/leads.test.ts` — заявки;
- `lib/history.test.ts` — undo/redo;
- `lib/auth/auth.test.ts` — auth;
- `lib/db/*.test.ts` — база, RLS и версии трассы.

Финальная проверка:

```bash
npm test
npm run lint
npm run build
npm run test:db
```

Затем вручную проверить:

1. `/calc`: все четыре шага, результат, копирование ссылки и отправка заявки.
2. `/podbor`: подбор номинала и отображение трассировки формул.
3. `/demo`: валидный и ошибочный preset, автоисправление и код заказа.
4. `/sravnenie`: кабель считается без `R` шинопровода; после ввода `R` появляются обе стороны.
5. `/app/route`: добавление участков/отводов, перетаскивание, Ctrl+Z/Ctrl+Shift+Z, BOM и версии.
6. `/app/converter`: XLSX/CSV/PDF/изображение, OCR и экспорт.
7. `/app/busbar-converter`: распознавание производителя и заводской артикул KLM-S.
8. `/register`, `/login`, `/app`: регистрация, cookie, выход и защита кабинета.
9. `/widget?dealer=<id>`: компактный layout и привязка заявки к дилеру.
10. `/api/health`: `200` при доступной БД и `503` при недоступной.

## 13. Важные ограничения и незавершённые части

- Номенклатура и цены завода переданы не полностью; полноценное ценообразование и КП не реализованы.
- Заказы, документы, админка справочников и интеграции с 1С/CRM остаются следующими этапами.
- Политика обработки персональных данных — техническая заготовка; финальный текст должен дать юрист.
- Часть данных получена OCR из PDF без текстового слоя; при обновлении каталога нужна повторная верификация.
- Не заменять каталожные значения догадками: неизвестное значение должно давать предупреждение или блокировать зависящий результат.
- В dev-режиме был замечен hydration warning на `/app/busbar-converter`: текст шага SSR отличался от клиентского текста. Перед production-релизом следует проверить детерминированность списка шагов в `TraySpecificationConverter.tsx` и отсутствие зависимости первого render от browser-only состояния.
- Нативный `@node-rs/argon2` удалён в пользу Web Crypto. Старые строки `$argon2id$...` новый код проверить не может: существующим пользователям нужен сброс пароля или отдельная миграция хешей до переключения трафика.

## 14. Что не смешивать с основным приложением

Каталог [`online-store-klm/`](online-store-klm) — отдельный статический прототип онлайн-магазина со своими `package.json`, `README.md`, `app.js`, CSS и тестом dev-server. Он не является маршрутом основного Next.js-приложения. Переносить его только если нужен именно этот отдельный прототип.

`demo-hosting/` — локальная готовая сборка/упаковка демонстрации. Источником истины остаются `app/`, `components/`, `lib/`, `data/`, `public/` и `drizzle/`.

## 15. Быстрый чек-лист для принимающего агента

- [ ] Убедиться, что исходная копия основана на `0e05fd7` или совместимом коммите.
- [ ] Сохранить локальные изменения старой версии.
- [ ] Предпочесть `merge upstream/main`; ручной перенос использовать только при разошедшейся истории.
- [ ] Перенести код, каталоги, OCR assets и миграции, но не кэши и секреты.
- [ ] Установить зависимости строго по `package-lock.json`.
- [ ] Создать `.env.local` и PostgreSQL базу.
- [ ] Применить миграции `0000 → 0001 → 0002`, затем seed.
- [ ] Запустить unit-, lint-, build- и DB-тесты.
- [ ] Пройти ручные сценарии всех URL из раздела 12.
- [ ] Исправить hydration warning конвертера до production-развёртывания.
- [ ] Не считать цены/КП готовыми, пока не загружены заводские прайс и номенклатура.

## 16. Контроль происхождения

Репозиторий текущей версии:

```text
https://github.com/davlatovs-21/klm-repo.git
```

Диапазон изменений от первой до документированной версии:

```text
0e05fd75354490dcd2c32a16ceefe763ddce87c0..1236dc2
235 файлов изменено, 256241 добавлений, 1861 удаление
```

Для точного сравнения старой копии с текущей:

```bash
git diff --stat 0e05fd7..1236dc2
git diff --name-status 0e05fd7..1236dc2
```

Этот документ описывает архитектуру и порядок переноса, но при доступе к Git точным источником содержимого каждого файла остаётся коммит `1236dc2`.
