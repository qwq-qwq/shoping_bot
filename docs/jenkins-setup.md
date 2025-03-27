# Настройка Jenkins Pipeline для Shopping Bot

## Предварительные требования

1. Установленный и настроенный Jenkins сервер
2. Установленные плагины:
   - Docker Pipeline
   - Pipeline
   - Git
   - Blue Ocean (опционально, для лучшего UI)
   - Credentials Binding

## Начальная настройка pipeline в Jenkins

1. В Jenkins создайте новый Pipeline проект
2. Настройте параметры источника кода:
   - Выберите "Pipeline script from SCM"
   - SCM: Git
   - Repository URL: URL вашего Git-репозитория
   - Credentials: Добавьте учетные данные для доступа к репозиторию
   - Branch Specifier: */main (или ваша основная ветка)
   - Script Path: Jenkinsfile

## Добавление учетных данных

Для безопасного хранения секретов (API ключей, паролей и т.д.) добавьте их в Jenkins Credentials:

1. Перейдите в Jenkins > Credentials > System > Global credentials
2. Нажмите "Add Credentials"
3. Добавьте следующие учетные данные:
   - OPENAI_API_KEY - секретный ключ API OpenAI
   - EMAIL_PASSWORD - пароль для отправки уведомлений по email

## Настройка webhook для автоматического запуска

Чтобы пайплайн запускался автоматически при изменениях в репозитории:

1. В настройках проекта Jenkins, включите опцию "Build Triggers" > "GitHub hook trigger for GITScm polling"
2. В настройках вашего GitHub репозитория, добавьте webhook:
   - Payload URL: `http://your-jenkins-server/github-webhook/`
   - Content type: `application/json`
   - Выберите события: Push, Pull Request

## Использование разных окружений

В проекте есть три окружения: development, staging и production. Для каждого окружения используется соответствующий файл Docker Compose:

- `docker-compose.development.yml` - для разработки
- `docker-compose.yml` - для сборки по умолчанию
- `docker-compose.production.yml` - для продакшн

В параметризованном пайплайне Jenkinsfile.advanced вы можете выбрать нужное окружение при запуске сборки.

## Ручной и автоматический запуск

### Ручной запуск:

1. Откройте проект в Jenkins
2. Нажмите "Build with Parameters"
3. Выберите нужные параметры:
   - ENVIRONMENT: development, staging или production
   - CLEANUP_IMAGES: очистка неиспользуемых Docker-образов
   - DOMAIN_NAME: доменное имя для доступа к боту
   - SKIP_TESTS: пропуск тестов при сборке

### Автоматический запуск:

Настройте разные проекты Jenkins для разных веток:
- main -> автоматический деплой в production
- staging -> автоматический деплой в staging
- develop -> автоматический деплой в development

## Продвинутые настройки

### Настройка уведомлений

В секции `post` в Jenkinsfile вы можете настроить отправку уведомлений:

```groovy
post {
    success {
        mail to: 'team@example.com', 
             subject: "Shopping Bot deployed to ${params.ENVIRONMENT}",
             body: "Deployment successful! Web interface available at: https://${params.DOMAIN_NAME}"
    }
    failure {
        mail to: 'team@example.com', 
             subject: "FAILED: Shopping Bot deployment to ${params.ENVIRONMENT}",
             body: "Deployment failed! Check Jenkins logs for details."
    }
}
```

### Настройка расписания

Для регулярного обновления (например, еженедельно), добавьте в настройках проекта:

Build Triggers > Build periodically:
```
0 2 * * 7  # Запуск каждое воскресенье в 2:00
```

## Поиск и устранение неисправностей

Если возникают проблемы с деплоем:

1. Проверьте логи Jenkins для поиска ошибок
2. Убедитесь, что все необходимые переменные окружения настроены
3. Проверьте доступность сети Docker Traefik

Для проверки работы контейнеров:
```bash
docker ps
docker logs shopping-bot-prod
```

## Дополнительные ресурсы

- [Документация Jenkins Pipeline](https://www.jenkins.io/doc/book/pipeline/)
- [Документация Docker Compose](https://docs.docker.com/compose/)
- [Документация Traefik](https://doc.traefik.io/traefik/)
