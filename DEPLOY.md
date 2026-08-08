# Деплой autoknow на VPS

Рассчитано на обычный Ubuntu 22.04/24.04 VPS (подходит для большинства
российских провайдеров — Timeweb Cloud, Selectel, RUVDS, Beget и т.п.).
Домены ниже — `autoknow.ru` (сайт) и `api.autoknow.ru` (бэкенд), замени на
свои везде по тексту.

## 0. Что понадобится заранее

- Домен, у которого можно менять DNS-записи
- IP-адрес VPS
- Реальные ключи: AITunnel, ЮKassa, SMTP (если ещё не вставил)

## 1. DNS

В панели управления доменом добавь две A-записи, обе на IP VPS:

```
autoknow.ru       A   <IP сервера>
api.autoknow.ru   A   <IP сервера>
```

Применяются от нескольких минут до пары часов.

## 2. Первичная настройка сервера

Подключись по SSH (`ssh root@<IP>`), дальше:

```bash
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# PostgreSQL
apt install -y postgresql postgresql-contrib

# nginx + certbot
apt install -y nginx certbot python3-certbot-nginx

# pm2 — держит оба процесса живыми, перезапускает при падении/перезагрузке
npm install -g pm2
```

## 3. База данных

```bash
sudo -u postgres psql
```

Внутри psql:

```sql
CREATE DATABASE autoknow;
CREATE USER autoknow_user WITH ENCRYPTED PASSWORD 'придумай-надёжный-пароль';
GRANT ALL PRIVILEGES ON DATABASE autoknow TO autoknow_user;
\q
```

Строка для `DATABASE_URL`:

```
postgresql://autoknow_user:придумай-надёжный-пароль@localhost:5432/autoknow
```

## 4. Загрузка проекта

Проще всего — залить архив (`scp` с локальной машины) и распаковать, либо через git, если уже завёл репозиторий:

```bash
mkdir -p /var/www/autoknow
cd /var/www/autoknow
# сюда распаковать backend/ и frontend/
```

## 5. Backend

```bash
cd /var/www/autoknow/backend
npm install
cp .env.example .env
nano .env   # заполнить реальными значениями, см. чек-лист ниже
npx prisma generate
npx prisma migrate deploy   # НЕ migrate dev — dev задаёт вопросы в интерактиве, deploy — для прода
npm run build
```

Чек-лист `.env` для прода:

```
DATABASE_URL=postgresql://autoknow_user:...@localhost:5432/autoknow
AI_API_KEY=<реальный ключ AITunnel>
JWT_SECRET=<вывод команды: openssl rand -hex 32>
APP_URL=https://autoknow.ru
ADMIN_EMAIL=fizikaestw@gmail.com
YOOKASSA_SHOP_ID=<реальный>
YOOKASSA_SECRET_KEY=<реальный>
SMTP_HOST=... (или что настроил)
```

## 6. Frontend

```bash
cd /var/www/autoknow/frontend
npm install
cp .env.local.example .env.local
nano .env.local
```

```
NEXT_PUBLIC_API_BASE_URL=https://api.autoknow.ru
NEXT_PUBLIC_SITE_URL=https://autoknow.ru
NEXT_PUBLIC_ADMIN_EMAIL=fizikaestw@gmail.com
```

```bash
npm run build
```

## 7. pm2 — держим оба процесса живыми

```bash
cd /var/www/autoknow/backend
pm2 start dist/main.js --name autoknow-backend

cd /var/www/autoknow/frontend
pm2 start npm --name autoknow-frontend -- start -- -p 3001

pm2 save
pm2 startup   # выведет одну команду — скопируй и выполни её, чтобы pm2 поднимался при перезагрузке сервера
```

Полезные команды: `pm2 logs`, `pm2 restart autoknow-backend`, `pm2 status`.

## 8. nginx — конфиг для сайта

nano /etc/nginx/sites-available/autoknow.ru
`/etc/nginx/sites-available/autoknow.ru`:

```nginx
server {
    listen 80;
    server_name autoknow.ru;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

`/etc/nginx/sites-available/api.autoknow.ru`:

```nginx
server {
    listen 80;
    server_name api.autoknow.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Включить и проверить:

```bash
ln -s /etc/nginx/sites-available/autoknow.ru /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/api.autoknow.ru /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 9. HTTPS

```bash
certbot --nginx -d autoknow.ru -d api.autoknow.ru
```

Certbot сам поправит nginx-конфиги на HTTPS и настроит автопродление.

## 10. Файрвол

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Порты 3000/3001 наружу открывать не нужно — к ним обращается только nginx на самом сервере (через `localhost`).

## 11. Последний штрих — вебхук ЮKassa

В личном кабинете ЮKassa (Настройки → HTTP-уведомления) указать:

```
https://api.autoknow.ru/billing/webhook/yookassa
```

Без этого баланс не будет зачисляться автоматически после оплаты.

## Обновление после деплоя (когда пришлю новый код)

```bash
cd /var/www/autoknow/backend   # или frontend
# заменить файлы
npm install                     # если появились новые зависимости
npx prisma migrate deploy       # если была новая миграция
npm run build
pm2 restart autoknow-backend    # или autoknow-frontend
```
