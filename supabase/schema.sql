-- Таблица членов семьи
create table family_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  color text default '#3B82F6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица счетов / кошельков
create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('cash', 'card', 'savings')),
  balance numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица категорий (с лимитом для бюджета-конверта)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('expense', 'income')),
  monthly_budget numeric default 0,
  icon text default 'shopping-bag',
  color text default '#10B981',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица кредитов, рассрочек и долгов
create table debts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  direction text not null default 'owe' check (direction in ('owe', 'owed')),
  total_amount numeric not null,
  paid_amount numeric not null default 0,
  monthly_payment numeric,
  due_day integer check (due_day between 1 and 31),
  note text,
  is_closed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица транзакций
create table transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null, -- только для переводов между счетами
  member_id uuid references family_members(id) on delete set null,
  debt_id uuid references debts(id) on delete set null, -- связь с кредитом / долгом
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

-- Политика доступа: полный доступ для аутентифицированных пользователей
create policy "Family full access members" on family_members for all to authenticated using (true) with check (true);
create policy "Family full access accounts" on accounts for all to authenticated using (true) with check (true);
create policy "Family full access categories" on categories for all to authenticated using (true) with check (true);
create policy "Family full access debts" on debts for all to authenticated using (true) with check (true);
create policy "Family full access transactions" on transactions for all to authenticated using (true) with check (true);

-- Начальные данные для быстрого старта (5 членов семьи Tai Budget)
insert into family_members (name, email, color) values 
  ('Папа', 'papa@tai.local', '#3B82F6'),
  ('Мама', 'mama@tai.local', '#EC4899'),
  ('Мансур', 'mansur@tai.local', '#8B5CF6'),
  ('Алишер', 'alisher@tai.local', '#06B6D4'),
  ('Ахмад', 'ahmad@tai.local', '#10B981');

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
  ('Кредиты и долги', 'expense', 60000, 'credit-card', '#6366F1'),
  ('Зарплата / Доход', 'income', 0, 'dollar-sign', '#10B981');

insert into debts (name, direction, total_amount, paid_amount, monthly_payment, due_day, note, is_closed) values
  ('Рассрочка Kaspi', 'owe', 240000, 80000, 20000, 15, 'Бытовая техника 0-0-12', false),
  ('Кредит', 'owe', 1200000, 360000, 40000, 25, 'Потребительский кредит', false);
