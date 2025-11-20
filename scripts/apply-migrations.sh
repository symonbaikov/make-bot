#!/bin/bash
# Скрипт для применения миграций Prisma в Railway

set -e

echo "🔧 Применение миграций Prisma в Railway"
echo "========================================"

# Проверка Railway CLI
if ! command -v railway &> /dev/null; then
  echo "❌ Railway CLI не установлен!"
  echo "Установите: npm i -g @railway/cli"
  exit 1
fi

# Проверка подключения к проекту
if [ ! -f ".railway/railway.toml" ]; then
  echo "📦 Подключение к Railway проекту..."
  railway link
fi

echo "🔍 Получение DATABASE_URL из Railway..."
DATABASE_URL=$(railway variables --json | jq -r '.[] | select(.name == "DATABASE_URL") | .value')

if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" == "null" ]; then
  echo "❌ DATABASE_URL не найден в Railway!"
  echo "Убедитесь, что:"
  echo "1. PostgreSQL сервис создан"
  echo "2. DATABASE_URL скопирован в Variables Backend сервиса"
  exit 1
fi

echo "✅ DATABASE_URL получен"
echo "📊 Применение схемы базы данных..."

cd backend
export DATABASE_URL

# Применяем схему
echo "Выполняю: npx prisma db push..."
npx prisma db push --skip-generate --accept-data-loss

echo "🌱 Запуск seed (создание админа)..."
npm run db:seed || {
  echo "⚠️ Seed не выполнился, но это не критично"
}

echo "========================================"
echo "✅ Миграции применены успешно!"
echo "========================================"
echo ""
echo "Проверьте:"
echo "1. Railway PostgreSQL → Database → Data (должны быть таблицы)"
echo "2. Попробуйте залогиниться: admin@example.com / admin123"

