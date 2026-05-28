
-- Execute no Supabase SQL Editor para habilitar todas as funções online da versão completa.

create table if not exists products (
  id text primary key,
  code text unique not null,
  name text not null,
  category text,
  cost numeric default 0,
  extra_cost numeric default 0,
  margin numeric default 0,
  sale_price numeric default 0,
  stock integer default 0,
  min_stock integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists clients (
  id text primary key,
  name text not null,
  phone text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists sales (
  id text primary key,
  sale_date date,
  product_code text,
  product_name text,
  client_id text,
  client_name text,
  quantity integer default 1,
  unit_price numeric default 0,
  total numeric default 0,
  paid numeric default 0,
  pending numeric default 0,
  payment text,
  due_date date,
  status text default 'pago',
  profit numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists payments (
  id text primary key,
  sale_id text,
  client_id text,
  client_name text,
  amount numeric default 0,
  payment_date date,
  method text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists suppliers (
  id text primary key,
  name text not null,
  phone text,
  notes text,
  created_at timestamp with time zone default now()
);
