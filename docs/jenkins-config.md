# Конфигурация Jenkins для Shopping Bot

Это руководство описывает настройку Jenkins pipeline для автоматического развертывания Shopping Bot с использованием Traefik.

## 1. Настройка нового пайплайна в Jenkins

1. **Создайте новый Item**:
   - Откройте Jenkins
   - Выберите "New Item"
   - Введите имя "shopping-bot"
   - Выберите тип "Pipeline"
   - Нажмите "OK"

2. **Настройте описание**:
   - Description: "Pipeline для автоматизации развертывания Shopping Bot с Traefik"

3. **Настройте параметры**:
   - Установите флажок "This project is parameterized"
   - Добавьте параметры:
     - Choice Parameter:
       - Name: `ENVIRONMENT`
       - Choices: `production\ndevelopment\nstaging`
       - Description: "Среда развертывания"
     - String Parameter:
       - Name: `DOMAIN_NAME`
       - Default Value: `shopping-bot.perek.rest`
       - Description: "Доменное имя для доступа к боту"
     - Boolean Parameter:
       - Name: `CLEANUP_IMAGES`
       - Default: false
       - Description: "Очистить неиспользуемые Docker-образы"

4. **Настройте триггеры сборки**:
   - Установите флажок "Build periodically" и введите расписание CRON:
     - `0 2 * * 1` (запуск каждый понедельник в 2:00)
   - Если используете GitHub, установите "GitHub hook trigger for GITScm polling"

5. **Настройте определение пайплайна**:
   - Pipeline > Definition: "Pipeline script from SCM"
   - SCM: Git
   - Repository URL: [URL вашего Git-репозитория]
   - Credentials: [Выберите или добавьте учетные данные]
   - Branch Specifier: */main
   - Script Path: Jenkinsfile

6. **Сохраните настройки**.

## 2. Настройка учетных данных

1. **Добавьте учетные данные**:
   - Jenkins > Manage Jenkins > Credentials > System > Global credentials > Add Credentials
   - Добавьте следующие Secret текстовые учетные данные:
     - OPENAI_API_KEY (ID: openai-api-key)
     - EMAIL_PASSWORD (ID: email-password)

## 3. Проверка и исправления проблем с Traefik

1. **Проверьте сеть Docker**:
   ```bash
   docker network ls
   ```

2. **Создайте сеть Traefik, если не существует**:
   ```bash
   docker network create traefik_web-network
   ```

3. **Проверьте настройки Traefik**:
   - Убедитесь, что в Traefik настроен правильный certResolver (myresolver)
   - Проверьте, что настроены правильные entrypoints (websecure)

4. **Проверьте доступность домена**:
   - Убедитесь, что DNS-записи для `shopping-bot.perek.rest` указывают на ваш сервер
   - Проверьте, что у Traefik есть доступ к SSL-сертификатам для этого домена

## 4. Первый запуск пайплайна

1. Откройте проект "shopping-bot" в Jenkins
2. Нажмите "Build with Parameters"
3. Выберите параметры:
   - ENVIRONMENT: production
   - DOMAIN_NAME: shopping-bot.perek.rest
   - CLEANUP_IMAGES: false
4. Нажмите "Build"

5. **Проверьте результаты**:
   - Проверьте логи сборки
   - Убедитесь, что все контейнеры запущены: `docker ps | grep shopping-bot`
   - Проверьте доступность веб-интерфейса: https://shopping-bot.perek.rest

## 5. Мониторинг и логи

Для поддержки работоспособности бота используйте следующие команды:

1. **Проверка логов контейнеров**:
   ```bash
   docker logs shopping-bot-prod
   docker logs shopping-bot-nginx-prod
   ```

2. **Проверка статуса контейнеров**:
   ```bash
   docker ps -a | grep shopping-bot
   ```

3. **Перезапуск контейнеров в случае проблем**:
   ```bash
   cd /путь/к/проекту
   docker-compose down
   docker-compose up -d
   ```

## 6. Автоматические обновления

Для настройки автоматических обновлений бота:

1. **Создайте отдельную задачу для обновления**:
   - New Item > "shopping-bot-update"
   - Pipeline with parameters
   - Добавьте параметр Boolean "FORCE_REBUILD" (default: false)

2. **Настройте расписание обновлений**:
   - Build periodically: `0 4 * * *` (каждый день в 4:00)

3. **Используйте следующий скрипт**:
   ```groovy
   pipeline {
       agent any
       
       parameters {
           booleanParam(name: 'FORCE_REBUILD', defaultValue: false, description: 'Пересобрать Docker-образы')
       }
       
       stages {
           stage('Checkout') {
               steps {
                   checkout scm
               }
           }
           
           stage('Update & Deploy') {
               steps {
                   sh 'cd /path/to/project'
                   sh 'git pull'
                   script {
                       if (params.FORCE_REBUILD) {
                           sh 'docker-compose build --no-cache'
                       }
                   }
                   sh 'docker-compose down'
                   sh 'docker-compose up -d'
               }
           }
       }
   }
   ```

## 7. Интеграция с другими системами

### Slack-уведомления

1. **Установите плагин Slack Notification в Jenkins**

2. **Настройте Slack Webhook в Jenkins**:
   - Manage Jenkins > Configure System > Slack
   - Team Domain: ваш домен в Slack
   - Integration Token: токен вашего Webhook
   - Channel: #deployments (или другой канал)

3. **Добавьте в Jenkinsfile**:
   ```groovy
   post {
       success {
           slackSend(
               channel: '#deployments', 
               color: 'good', 
               message: "УСПЕШНО: Деплой Shopping Bot в ${params.ENVIRONMENT}"
           )
       }
       failure {
           slackSend(
               channel: '#deployments', 
               color: 'danger', 
               message: "ОШИБКА: Деплой Shopping Bot в ${params.ENVIRONMENT} не удался"
           )
       }
   }
   ```

### Telegram-уведомления

1. **Установите плагин Telegram Notifications в Jenkins**

2. **Настройте Telegram Bot в Jenkins**:
   - Manage Jenkins > Configure System > Telegram Notifications
   - Bot Token: токен вашего Telegram бота
   - Chat ID: ID вашего чата или группы

3. **Добавьте в Jenkinsfile**:
   ```groovy
   post {
       success {
           telegramSend(
               message: "✅ УСПЕШНО: Деплой Shopping Bot в ${params.ENVIRONMENT} завершен", 
               chatId: -123456789
           )
       }
       failure {
           telegramSend(
               message: "❌ ОШИБКА: Деплой Shopping Bot в ${params.ENVIRONMENT} не удался", 
               chatId: -123456789
           )
       }
   }
   ```

## 8. Решение проблем

### Проблемы с Docker

1. **Ошибка "network ... not found"**:
   ```bash
   docker network create traefik_web-network
   ```

2. **Проблемы с правами доступа**:
   ```bash
   sudo usermod -aG docker jenkins
   # Перезапустите Jenkins
   sudo systemctl restart jenkins
   ```

3. **Ошибка "no space left on device"**:
   ```bash
   docker system prune -a
   ```

### Проблемы с Jenkins

1. **Pipeline не запускается по расписанию**:
   - Проверьте синтаксис CRON
   - Проверьте временную зону Jenkins

2. **Ошибка доступа к Git**:
   - Проверьте учетные данные
   - Убедитесь, что SSH-ключи настроены правильно

3. **Проблемы с доступом к файлам**:
   ```bash
   sudo chown -R jenkins:jenkins /path/to/project
   ```

## 9. Поддержка

### Обновления Jenkins

Регулярно обновляйте Jenkins и плагины:
- Manage Jenkins > Manage Plugins > Updates

### Резервное копирование конфигурации

Настройте резервное копирование конфигурации Jenkins:
```bash
# Создание резервной копии
cp -r /var/lib/jenkins/jobs/shopping-bot /backup/jenkins/jobs/
```

### Мониторинг диска

Настройте мониторинг свободного места на диске:
```bash
# Добавьте в crontab
0 * * * * df -h | grep -q "9[0-9]%" && echo "Мало места на диске" | mail -s "Warning: Low disk space" admin@example.com
```
