# BA Agent — AI Бизнес-Аналитик

Полноценный AI-агент для бизнес-аналитиков. Работает с глоссарием компании, анализирует бизнес-требования, обрабатывает заметки со встреч и отвечает на вопросы по данным.

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируй файл примера:
```bash
cp .env.local.example .env.local
```

Заполни `.env.local`:
```
GEMINI_API_KEY=sk-ant-...         # Ключ с console.ai.google.dev
NEXT_PUBLIC_SUPABASE_URL=https://...  # URL проекта Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # anon key из Supabase
SUPABASE_SERVICE_ROLE_KEY=...         # service_role key из Supabase
```

### 3. Настройка Supabase

1. Создай проект на [supabase.com](https://supabase.com)
2. Перейди в **SQL Editor** в Supabase Dashboard
3. Скопируй и выполни содержимое файла `lib/schema.sql`
4. Готово — таблицы созданы

### 4. Запуск

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

---

## Возможности

| Раздел | Что делает |
|--------|-----------|
| **Чат** | AI-агент с доступом к глоссарию, требованиям и заметкам |
| **Глоссарий** | Загрузка файлов терминов компании (.txt, .csv, .docx, .pdf) |
| **Требования** | Загрузка БТ + автоанализ (ошибки, конфликты, улучшения) |
| **Заметки** | Загрузка заметок со встреч + автоизвлечение задач |
| **Дашборд** | Визуализация метрик + AI-подсказки по данным |

## Деплой на Vercel

```bash
# Установи Vercel CLI
npm i -g vercel

# Деплой
vercel

# Добавь переменные окружения в Vercel Dashboard:
# Settings → Environment Variables
```

Или через GitHub: подключи репозиторий в [vercel.com](https://vercel.com), добавь переменные окружения в настройках — деплой автоматический.

## Поддерживаемые форматы файлов

- Глоссарий: `.txt`, `.csv`, `.md`, `.docx`, `.pdf`
- Требования: `.txt`, `.md`, `.docx`, `.pdf`
- Заметки: `.txt`, `.md`, `.docx`

## Структура проекта

```
ba-agent/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Стриминг чата с агентом
│   │   ├── upload-glossary/route.ts   # CRUD глоссария
│   │   ├── upload-requirements/route.ts # Загрузка и анализ БТ
│   │   └── upload-notes/route.ts      # Обработка заметок
│   ├── dashboard/page.tsx             # Дашборд с графиками
│   ├── glossary/page.tsx              # Управление глоссарием
│   ├── notes/page.tsx                 # Заметки и задачи
│   ├── requirements/page.tsx          # Бизнес-требования
│   └── page.tsx                       # Главная — чат
├── components/
│   └── Sidebar.tsx                    # Навигация
├── lib/
│   ├── agent.ts                       # AI логика + системный промпт
│   ├── fileParser.ts                  # Парсинг файлов
│   ├── prompts.ts                     # Быстрые вопросы
│   ├── schema.sql                     # SQL для Supabase
│   └── supabase.ts                    # Supabase клиент
└── types/index.ts                     # TypeScript типы
```
