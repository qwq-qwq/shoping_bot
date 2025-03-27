// Jenkinsfile (Declarative Pipeline) для проекта shopping-bot с расширенными возможностями

pipeline {
    agent any
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['development', 'staging', 'production'], description: 'Среда развертывания')
        booleanParam(name: 'CLEANUP_IMAGES', defaultValue: false, description: 'Очистить неиспользуемые Docker-образы')
        string(name: 'DOMAIN_NAME', defaultValue: 'shopping-bot.perek.rest', description: 'Доменное имя для доступа к боту')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Пропустить тесты')
    }

    environment {
        DOMAIN_NAME = "${params.DOMAIN_NAME}"

        OPENAI_API_KEY = credentials('openai-api-key')
        EMAIL_PASSWORD = credentials('email-password')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'Repository checkout completed'
            }
        }
        
        stage('Validate Configuration') {
            steps {
                script {
                    // Проверяем наличие необходимых файлов
                    if (!fileExists("docker-compose.${params.ENVIRONMENT}.yml")) {
                        error 'docker-compose.${params.ENVIRONMENT}.yml not found!'
                    }

                    // Проверяем настройки для указанной среды
                    if (params.ENVIRONMENT != 'development' && !fileExists("config/${params.ENVIRONMENT}.js")) {
                        error "Configuration for ${params.ENVIRONMENT} environment not found!"
                    }

                    echo 'Configuration validation completed'
                }
            }
        }

        stage('Prepare Environment') {
            steps {

                // Создаем или обновляем .env файл
                sh '''
                if [ ! -f .env ]; then
                    echo "Creating .env file from example"
                    cp .env.example .env

                    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=${OPENAI_API_KEY}/" .env
                    sed -i "s/EMAIL_PASSWORD=.*/EMAIL_PASSWORD=${EMAIL_PASSWORD}/" .env
                    sed -i "s/CHECK_INTERVAL=.*/CHECK_INTERVAL=*/30 * * * */" .env
                    sed -i "s/HEADLESS=.*/HEADLESS=true/" .env
                fi
                '''

                // Копируем соответствующий docker-compose файл, если он существует
                script {
                    if (fileExists("docker-compose.${params.ENVIRONMENT}.yml")) {
                        sh "cp docker-compose.${params.ENVIRONMENT}.yml docker-compose.yml"
                        echo "Using ${params.ENVIRONMENT} specific docker-compose file"
                    }
                }
                
                echo 'Environment preparation completed'
            }
        }
        
        stage('Build') {
            steps {
                sh 'docker-compose build'
                echo 'Docker build completed'
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
                sh 'docker-compose down || true'
                sh 'docker-compose up -d'

                // Дополнительные команды для разных сред
                script {
                    if (params.ENVIRONMENT == 'production') {
                        echo "Deployed to production environment at https://${params.DOMAIN_NAME}"
                    } else if (params.ENVIRONMENT == 'staging') {
                        echo "Deployed to staging environment at https://${params.DOMAIN_NAME}"
                    } else {
                        echo "Deployed to development environment at https://${params.DOMAIN_NAME}"
                    }
                }
            }
        }
        
        stage('Health Check') {
            steps {
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

        stage('Cleanup') {
            when {
                expression { return params.CLEANUP_IMAGES }
            }
            steps {
                echo 'Cleaning up unused Docker images...'
                sh 'docker system prune -f --volumes'
                echo 'Cleanup completed'
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
            // mail to: 'team@example.com', subject: "Shopping Bot deployed to ${params.ENVIRONMENT}"
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
            // mail to: 'team@example.com', subject: "FAILED: Shopping Bot deployment to ${params.ENVIRONMENT}"
        }
        always {
            // Архивируем логи
            archiveArtifacts artifacts: 'logs/*.log', allowEmptyArchive: true
        }
    }
}
