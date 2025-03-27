#!/bin/bash

# Скрипт для запуска и управления shopping-bot с Traefik

# Проверка наличия docker и docker-compose
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "Ошибка: Необходимо установить Docker и Docker Compose"
    exit 1
fi

# Функция для вывода информации о использовании
usage() {
    echo "Использование: $0 [команда]"
    echo "Команды:"
    echo "  start        - Запустить бота"
    echo "  stop         - Остановить бота"
    echo "  restart      - Перезапустить бота"
    echo "  logs         - Показать логи бота"
    echo "  status       - Показать статус бота"
    echo "  update       - Обновить код из репозитория и перезапустить бота"
    echo "  build        - Пересобрать Docker-образ бота"
    echo "  config       - Открыть файл конфигурации в редакторе"
    echo "  help         - Показать эту справку"
}

# Проверка текущей директории
if [ ! -f "docker-compose.yml" ] || [ ! -d "src" ]; then
    echo "Ошибка: Скрипт должен быть запущен из корневой директории проекта shopping-bot"
    exit 1
fi

# Создание необходимых директорий
mkdir -p logs screenshots html/screenshots nginx/conf.d

# Обработка команд
case "$1" in
    start)
        echo "Запуск shopping-bot..."
        docker-compose up -d
        echo "Bot запущен. Доступен по адресу: shopping-bot.perek.rest"
        ;;
    stop)
        echo "Остановка shopping-bot..."
        docker-compose down
        echo "Bot остановлен."
        ;;
    restart)
        echo "Перезапуск shopping-bot..."
        docker-compose down
        docker-compose up -d
        echo "Bot перезапущен."
        ;;
    logs)
        echo "Показ логов shopping-bot..."
        docker-compose logs -f
        ;;
    status)
        echo "Статус контейнеров shopping-bot:"
        docker-compose ps
        ;;
    update)
        echo "Обновление shopping-bot..."
        git pull
        docker-compose down
        docker-compose build
        docker-compose up -d
        echo "Bot обновлен и перезапущен."
        ;;
    build)
        echo "Пересборка Docker-образа shopping-bot..."
        docker-compose build
        echo "Образ пересобран."
        ;;
    config)
        echo "Открытие файла конфигурации..."
        ${EDITOR:-nano} config/default.js
        ;;
    help)
        usage
        ;;
    *)
        echo "Неизвестная команда: $1"
        usage
        exit 1
        ;;
esac

exit 0
