#!/bin/bash
# Скрипт для проверки таблиц в базе данных

set -e

echo "🔍 Проверка таблиц в базе данных..."
echo "======================================"

# Проверка DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL не установлен!"
  echo "Установите: export DATABASE_URL=\"postgresql://...\""
  exit 1
fi

echo "✅ DATABASE_URL установлен"
echo ""

# Проверка подключения
echo "Проверка подключения к базе данных..."
node -e "
const { Client } = require('pg');
const client = new Client(process.env.DATABASE_URL);
client.connect()
  .then(() => {
    console.log('✅ Подключение успешно');
    return client.query('SELECT current_database(), current_user');
  })
  .then(result => {
    console.log('База данных:', result.rows[0].current_database);
    console.log('Пользователь:', result.rows[0].current_user);
    return client.query(\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    \`);
  })
  .then(result => {
    console.log('');
    console.log('📊 Таблицы в базе данных:');
    if (result.rows.length === 0) {
      console.log('  ❌ Таблицы не найдены!');
    } else {
      result.rows.forEach(row => {
        console.log('  ✅', row.table_name);
      });
    }
    return client.end();
  })
  .catch(err => {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  });
"

echo ""
echo "======================================"

