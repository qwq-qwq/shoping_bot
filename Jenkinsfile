// Jenkinsfile (Declarative Pipeline) для проекта shopping-bot с расширенными возможностями

pipeline {
    agent any

    triggers {
        // Запуск каждые 3 дня в 02:00
        cron('0 2 */3 * *')
    }
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['auto', 'development', 'staging', 'production'], description: 'Среда развертывания (auto - автоматическое определение)')
        booleanParam(name: 'CLEANUP_IMAGES', defaultValue: true, description: 'Очистить неиспользуемые Docker-образы')
        string(name: 'DOMAIN_NAME', defaultValue: 'shopping-bot.perek.rest', description: 'Доменное имя для доступа к боту')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Пропустить тесты')
        booleanParam(name: 'FORCE_REBUILD', defaultValue: true, description: 'Принудительная пересборка контейнеров')
    }

    environment {
        DOMAIN_NAME = "${params.DOMAIN_NAME}"

        OPENAI_API_KEY = credentials('openai-api-key')
        EMAIL_PASSWORD = credentials('email-password')
        APP_DIR = "/opt/projects/shopping-bot"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Repository checkout completed'
            }
        }
        
        stage('Determine Environment') {
            steps {
                script {
                    // Автоматическое определение окружения если выбран 'auto'
                    if (params.ENVIRONMENT == 'auto') {
                        def runningContainers = sh(
                            script: "docker ps --format 'table {{.Names}}' | grep shopping-bot || true",
                            returnStdout: true
                        ).trim()
                        
                        if (runningContainers.contains('shopping-bot-prod')) {
                            env.DETECTED_ENVIRONMENT = 'production'
                            echo "Автоматически определено production окружение"
                        } else if (runningContainers.contains('shopping-bot-dev')) {
                            env.DETECTED_ENVIRONMENT = 'development'
                            echo "Автоматически определено development окружение"
                        } else {
                            env.DETECTED_ENVIRONMENT = 'development'
                            echo "Контейнеры не найдены, используется development по умолчанию"
                        }
                    } else {
                        env.DETECTED_ENVIRONMENT = params.ENVIRONMENT
                        echo "Используется заданное окружение: ${params.ENVIRONMENT}"
                    }
                    
                    // Проверяем наличие необходимых файлов
                    if (!fileExists("docker-compose.${env.DETECTED_ENVIRONMENT}.yml")) {
                        error "docker-compose.${env.DETECTED_ENVIRONMENT}.yml not found!"
                    }

                    // Проверяем настройки для указанной среды
                    if (env.DETECTED_ENVIRONMENT != 'development' && !fileExists("config/${env.DETECTED_ENVIRONMENT}.js")) {
                        error "Configuration for ${env.DETECTED_ENVIRONMENT} environment not found!"
                    }

                    echo "Configuration validation completed for ${env.DETECTED_ENVIRONMENT}"
                }
            }
        }

        stage('Prepare Environment') {
            steps {

                // Создаем или обновляем .env файл
                sh '''
                    echo "Creating .env file from example"
                    cp .env.example .env

                    sed -i "s/EMAIL_FROM=.*/EMAIL_FROM=mail.bot.perek@gmail.com/" .env
                    sed -i "s/EMAIL_TO=.*/EMAIL_TO=sergey@perek.rest/" .env
                    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=${OPENAI_API_KEY}/" .env
                    sed -i "s/EMAIL_PASSWORD=.*/EMAIL_PASSWORD=${EMAIL_PASSWORD}/" .env
                    sed -i 's|CHECK_INTERVAL=.*|CHECK_INTERVAL="0 */2 * * *"|' .env
                    sed -i "s/HEADLESS=.*/HEADLESS=true/" .env
                '''

                // Копируем соответствующий docker-compose файл, если он существует
                script {
                    if (fileExists("docker-compose.${env.DETECTED_ENVIRONMENT}.yml")) {
                        sh "cp docker-compose.${env.DETECTED_ENVIRONMENT}.yml docker-compose.yml"
                        echo "Using ${env.DETECTED_ENVIRONMENT} specific docker-compose file"
                    }
                }
                
                echo 'Environment preparation completed'
            }
        }

        stage('Prepare Deployment') {
              steps {
                   sh "mkdir -p ${env.APP_DIR}/config ${env.APP_DIR}/logs ${env.APP_DIR}/screenshots ${env.APP_DIR}/status ${env.APP_DIR}/nginx/conf.d"
                   sh "mkdir -p ${env.APP_DIR}/html ${env.APP_DIR}/src"

                   // Копируем конфигурации nginx
                   sh "cp -r nginx/conf.d/* ${env.APP_DIR}/nginx/conf.d/"

                   // Копируем необходимые файлы в директорию деплоя
                   sh "cp -r config/* ${env.APP_DIR}/config/"
                   sh "cp -r html/* ${env.APP_DIR}/html/"
                   sh "cp -r src/* ${env.APP_DIR}/src/"
                   sh "cp package*.json ${env.APP_DIR}/"
                   sh "cp Dockerfile ${env.APP_DIR}/"
                   sh "cp docker-compose.yml ${env.APP_DIR}/"
                   sh "cp .env ${env.APP_DIR}/"

                   // Создаем метку версии
                   sh "echo 'BUILD_ID=${env.BUILD_ID}\nBUILD_NUMBER=${env.BUILD_NUMBER}\nGIT_COMMIT=${env.GIT_COMMIT_SHORT}\nBUILD_TIMESTAMP=${env.BUILD_TIMESTAMP}' > ${env.APP_DIR}/version.txt"
              }
        }
        
        stage('Build') {
            steps {
              dir("${env.APP_DIR}") {
                    // Останавливаем предыдущие контейнеры если они есть
                    sh 'docker-compose down || true'

                    // Если включена принудительная пересборка, очищаем образы
                    script {
                        if (params.FORCE_REBUILD) {
                            echo "Принудительная пересборка: очистка образов..."
                            sh 'docker image prune -f'
                            sh 'docker-compose build --no-cache'
                        } else {
                            sh 'docker-compose build'
                        }
                    }

                    // Обновляем версию образа в docker-compose.yml
                    sh "sed -i 's|image: ${env.APP_NAME}:[^[:space:]]*|image: ${env.APP_NAME}:${env.BUILD_NUMBER}|g' docker-compose.yml"

                    // Запускаем контейнеры
                    sh 'docker-compose up -d'
               }
            }
        }
        
        stage('Test') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                echo 'Running tests...'

                // Здесь могут быть различные тесты
                // Пример: npm test или docker-compose run --rm shopping-bot npm test

                echo 'Tests completed'
            }
        }

        stage('Deploy') {
            steps {
                dir("${env.APP_DIR}") {
                    sh 'docker-compose down || true'
                    sh 'docker-compose up -d'

                    // Дополнительные команды для разных сред
                    script {
                       if (env.DETECTED_ENVIRONMENT == 'production') {
                            echo "Deployed to production environment at https://${params.DOMAIN_NAME}"
                       } else if (env.DETECTED_ENVIRONMENT == 'staging') {
                            echo "Deployed to staging environment at https://${params.DOMAIN_NAME}"
                       } else {
                            echo "Deployed to development environment at https://${params.DOMAIN_NAME}"
                       }
                   }
                }
            }
        }
        
        stage('Health Check') {
            steps {
                dir("${env.APP_DIR}") {
                    sh 'docker-compose ps'
                    sh 'sleep 15' // Даем больше времени для запуска
                    sh 'docker-compose logs --tail=100'

                    script {
                        def containers = sh(script: 'docker-compose ps -q', returnStdout: true).trim()
                    
                        if (containers) {
                            echo 'Containers are running'
                        } else {
                            error 'No containers running after deployment!'
                        }
                    }
                    
                    echo 'Health check completed'
                }
            }
        }

        stage('Cleanup') {
            when {
                expression { return params.CLEANUP_IMAGES }
            }
            steps {
                dir("${env.APP_DIR}") {
                    echo 'Remove .env'
                    sh 'rm -f .env'
                    echo 'Cleaning up unused Docker images...'
                    sh 'docker image prune -f'
                    sh 'docker system prune -f --volumes'
                    sh 'docker builder prune -f'
                    echo 'Cleanup completed'
                }
            }
        }
    }
    
    post {
        success {
            echo '''
            ====================================
                DEPLOYMENT SUCCESSFUL
            ====================================
            '''
            echo "Web interface available at: https://${params.DOMAIN_NAME}"

            // Отправка уведомления об успешном деплое
            mail to: 'sergey@perek.rest', subject: "Shopping Bot deployed to ${env.DETECTED_ENVIRONMENT}"
        }
        failure {
            echo '''
            ====================================
                DEPLOYMENT FAILED
            ====================================
            '''

            // Пытаемся остановить контейнеры в случае ошибки
            sh 'docker-compose down || true'

            // Отправка уведомления о неудачном деплое
            mail to: 'sergey@perek.rest', subject: "FAILED: Shopping Bot deployment to ${env.DETECTED_ENVIRONMENT}"
        }
        always {
            // Архивируем логи
            archiveArtifacts artifacts: 'logs/*.log', allowEmptyArchive: true
        }
    }
}
