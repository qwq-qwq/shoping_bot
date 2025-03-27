# Настройка Blue Ocean для Shopping Bot

Blue Ocean предоставляет современный, удобный интерфейс для работы с Jenkins Pipeline.

## Установка Blue Ocean

1. В Jenkins перейдите в **Manage Jenkins > Manage Plugins**
2. Откройте вкладку **Available**
3. Найдите "Blue Ocean" в поиске
4. Выберите плагин и нажмите **Install without restart**
5. После установки нажмите на **Blue Ocean** в левой панели навигации Jenkins

## Создание pipeline через Blue Ocean

1. Откройте Blue Ocean
2. Нажмите **Create a new Pipeline**
3. Выберите где расположен ваш репозиторий (например, GitHub)
4. Авторизуйтесь с помощью токена доступа
5. Выберите организацию
6. Выберите репозиторий `shopping-bot`
7. Нажмите **Create Pipeline**

Blue Ocean автоматически найдет Jenkinsfile в вашем репозитории и создаст пайплайн.

## Работа с пайплайном в Blue Ocean

### Запуск сборки:

1. Откройте пайплайн в Blue Ocean
2. Нажмите **Run** в правом верхнем углу
3. Выберите параметры для сборки
4. Нажмите **Run**

### Мониторинг выполнения:

Blue Ocean предоставляет визуальное представление выполнения пайплайна:

- Зеленый цвет: Успешное выполнение
- Красный цвет: Ошибка
- Синий цвет: Выполняется
- Серый цвет: Пропущено

Нажмите на любой этап для просмотра подробных логов.

### Отладка ошибок:

1. Нажмите на этап с ошибкой
2. Просмотрите логи выполнения
3. Исправьте проблему в коде и запустите сборку заново

## Настройка параллельных этапов

Для ускорения сборки можно настроить параллельное выполнение этапов в Jenkinsfile:

```groovy
pipeline {
    agent any
    
    stages {
        stage('Parallel Processing') {
            parallel {
                stage('Build') {
                    steps {
                        sh 'docker-compose build'
                    }
                }
                stage('Test') {
                    steps {
                        sh 'npm test'
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh 'docker-compose up -d'
            }
        }
    }
}
```

## Jenkins Multi-branch Pipeline

Для работы с разными ветками проекта (например, development, staging, production) настройте Multi-branch Pipeline:

1. В Jenkins создайте новый элемент типа **Multibranch Pipeline**
2. Настройте источник кода так же, как для обычного Pipeline
3. В разделе **Branch Sources** настройте поведение для разных веток:
   - **Discover branches**: All branches
   - **Filter by name (with wildcards)**: `*/main` `*/develop` `*/staging`

Теперь Jenkins автоматически создаст отдельные пайплайны для каждой ветки и будет запускать их при обновлении кода.

## Шаблоны для визуализации в Blue Ocean

Для лучшей визуализации в Blue Ocean добавьте в Jenkinsfile:

```groovy
pipeline {
    agent any
    
    options {
        // Добавляет название и описание сборки для лучшей визуализации
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }
    
    stages {
        // Группировка связанных этапов
        stage('Prepare') {
            stages {
                stage('Checkout') { ... }
                stage('Setup') { ... }
            }
        }
        
        stage('Deploy') { ... }
    }
    
    post {
        // Отображение статуса в Blue Ocean
        always { 
            echo 'Pipeline completed'
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
```

## Визуальный редактор пайплайна

Blue Ocean предоставляет визуальный редактор для создания и изменения Jenkinsfile:

1. Откройте пайплайн в Blue Ocean
2. Нажмите **Edit** в правом верхнем углу
3. Используйте визуальный редактор для добавления, изменения или удаления этапов
4. Нажмите **Save** для сохранения изменений в репозиторий

## Настройка уведомлений в Blue Ocean

Blue Ocean интегрируется с различными системами уведомлений:

1. Отправка результатов в Slack:
   ```groovy
   post {
       success {
           slackSend(channel: '#deployments', color: 'good', message: 'Deployment successful!')
       }
       failure {
           slackSend(channel: '#deployments', color: 'danger', message: 'Deployment failed!')
       }
   }
   ```

2. Отправка Email-уведомлений:
   ```groovy
   post {
       failure {
           mail to: 'team@example.com',
                subject: "Failed Pipeline: ${currentBuild.fullDisplayName}",
                body: "Something went wrong with ${env.BUILD_URL}"
       }
   }
   ```

## Советы по использованию Blue Ocean

1. **Закрепляйте часто используемые пайплайны**: Нажмите на звездочку рядом с названием пайплайна для добавления в избранное.

2. **Используйте фильтры**: В списке пайплайнов используйте поиск и фильтры для быстрого доступа к нужным проектам.

3. **Просмотр тестов**: Blue Ocean предоставляет удобный интерфейс для просмотра результатов тестов. Используйте плагин JUnit для публикации результатов тестов.

4. **Экспорт пайплайна**: Для создания сложных пайплайнов используйте визуальный редактор, а затем экспортируйте Jenkinsfile для дальнейшей настройки.

5. **Вложенные этапы**: Используйте вложенные этапы для группировки связанных шагов и улучшения визуального представления пайплайна.
