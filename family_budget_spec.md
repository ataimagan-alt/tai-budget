# Tai Budget — Техническое задание для Antigravity

## 1. Стек и конфигурация приложения
- **Название приложения**: **Tai Budget** (`appId: "local.tai.budget"`, `appName: "Tai Budget"` в `capacitor.config.json` и `<title>Tai Budget</title>` в `index.html`).
- **Клиент**: React 18+ (Vite), Tailwind CSS, Lucide-react (иконки).
- **Мобильная оболочка**: `@capacitor/core`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share` ([документация Capacitor Android](https://capacitorjs.com/docs/android)).
- **База данных и Auth**: [Supabase](https://supabase.com/docs) (`@supabase/supabase-js`) с персональным входом по Email + Пароль для 5 членов семьи (`*@tai.local`).
- **Экспорт**: `xlsx` (SheetJS).
- **CI/CD**: [GitHub Actions](https://github.com/features/actions) для автоматической сборки `.apk` (`./gradlew assembleDebug`).

## 2. Структура базы данных (Supabase SQL)

Выполните этот скрипт в разделе **SQL Editor** в консоли [Supabase](https://supabase.com/docs):

```sql
-- Таблица членов семьи (привязана к email из Supabase Auth)
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  color text default '#3B82F6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица счетов / кошельков
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('cash', 'card', 'savings')),
  balance numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица категорий (с лимитом для бюджета-конверта)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('expense', 'income')),
  monthly_budget numeric default 0,
  icon text default 'shopping-bag',
  color text default '#10B981',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица кредитов, рассрочек и внешних долгов
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  direction text not null check (direction in ('owe', 'owed')), -- 'owe' = мы должны (кредит/рассрочка/долг), 'owed' = нам должны
  total_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  monthly_payment numeric default 0,
  due_day integer check (due_day between 1 and 31),
  note text,
  is_closed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица транзакций
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null,
  debt_id uuid references debts(id) on delete set null,
  member_id uuid references family_members(id) on delete set null,
  note text,
  transaction_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Включение RLS
alter table family_members enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table debts enable row level security;
alter table transactions enable row level security;

-- Политика доступа: полный доступ для авторизованных членов семьи
create policy "Family full access members" on family_members for all to authenticated using (true) with check (true);
create policy "Family full access accounts" on accounts for all to authenticated using (true) with check (true);
create policy "Family full access categories" on categories for all to authenticated using (true) with check (true);
create policy "Family full access debts" on debts for all to authenticated using (true) with check (true);
create policy "Family full access transactions" on transactions for all to authenticated using (true) with check (true);

-- Состав семьи (5 активных пользователей)
delete from transactions;
delete from family_members;

insert into family_members (name, email, color) values 
  ('Папа', 'papa@tai.local', '#3B82F6'),
  ('Мама', 'mama@tai.local', '#EC4899'),
  ('Мансур', 'mansur@tai.local', '#8B5CF6'),
  ('Алишер', 'alisher@tai.local', '#06B6D4'),
  ('Ахмад', 'ahmad@tai.local', '#10B981');

-- Стартовые счета и категории
insert into accounts (name, type, balance) values
  ('Основная карта', 'card', 0),
  ('Наличные', 'cash', 0),
  ('Депозит / Копилка', 'savings', 0);

insert into categories (name, type, monthly_budget, icon, color) values
  ('Продукты', 'expense', 150000, 'shopping-cart', '#EF4444'),
  ('Коммуналка и дом', 'expense', 40000, 'home', '#F59E0B'),
  ('Транспорт и бензин', 'expense', 30000, 'car', '#3B82F6'),
  ('Развлечения и кафе', 'expense', 35000, 'coffee', '#8B5CF6'),
  ('Здоровье и аптека', 'expense', 20000, 'activity', '#EC4899'),
  ('Кредиты и долги', 'expense', 50000, 'credit-card', '#6366F1'),
  ('Зарплата / Доход', 'income', 0, 'dollar-sign', '#10B981');
```

## 3. Экраны и сценарии интерфейса

### 1. Стандартный экран входа (`AuthScreen.jsx`)
- Чистая карточка входа: логотип, название **Tai Budget**, поля `Email` (`alisher@tai.local`) и `Пароль`, кнопка «Войти».
- При входе через `supabase.auth.signInWithPassword` приложение автоматически сопоставляет `user.email` с записью в таблице `family_members`.

### 2. Главный экран («Бюджет и Конверты»)
- Переключатель месяцев, сводная плашка бюджета, карточки счетов и конверты категорий с прогресс-барами.

### 3. Секция / Вкладка «Кредиты и Долги» (`DebtsView.jsx`)
- Доступна через нижнюю навигацию (`Бюджет` | `Кредиты/Долги` | `+` | `История`) или как отдельная секция на главном экране.
- Два понятных подраздела (переключателя):
  - **«Кредиты, рассрочки и наши долги» (`direction = 'owe'`)**: что должна выплатить семья (например, рассрочка за технику, автокредит, долг знакомым).
  - **«Нам должны» (`direction = 'owed'`)**: деньги, которые взяли в долг у семьи.
- На каждой карточке кредита/долга отображаются:
  - Название, общая сумма (`total_amount`), сколько уже погашено (`paid_amount`) и сколько **осталось выплатить** (`total_amount - paid_amount`).
  - Наглядная полоска прогресса погашения (`Погашено X ₸ из Y ₸`).
  - Если указан ежемесячный платёж (`monthly_payment`) и день платежа (`due_day`), выводится подсказка: `Ежемесячно: X ₸ • до N-го числа`.
  - Кнопка **«Внести платёж»**: в 1 клик открывает окошко, где уже подставлена сумма ежемесячного платежа (можно изменить) и выбран счёт списания/зачисления. При подтверждении:
    1) увеличивается `paid_amount` у кредита/долга (если выплачен полностью — помечается закрытым);
    2) списывается/зачисляется сумма со счёта (`accounts.balance`);
    3) создаётся запись в `transactions`, чтобы платёж отобразился в общей Истории и попал в месячный Excel-отчёт.

### 4. Экран «История и Отчёты» (`HistoryView.jsx`)
- Лента всех операций семьи за месяц с фильтрами, редактированием, удалением и кнопкой «Скачать Excel (.xlsx)».

## 4. Конфигурация GitHub Actions для сборки APK

Файл в проекте: `.github/workflows/build-apk.yml`

```yaml
name: Build Tai Budget APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    name: Build APK
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build Web App
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Build Debug APK
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: TaiBudget-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
```