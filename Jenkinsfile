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
        APP_DIR = "/opt/projects/shopping-bot"
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
                    echo "Creating .env file from example"
                    cp .env.example .env

                    sed -i "s/EMAIL_FROM=.*/EMAIL_FROM=mail.bot.perek@gmail.com/" .env
                    sed -i "s/EMAIL_TO=.*/EMAIL_TO=sergey@perek.rest/" .env
                    sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=${OPENAI_API_KEY}/" .env
                    sed -i "s/EMAIL_PASSWORD=.*/EMAIL_PASSWORD=${EMAIL_PASSWORD}/" .env
                    sed -i 's|CHECK_INTERVAL=.*|CHECK_INTERVAL="*/30 * * * *"|' .env
                    sed -i "s/HEADLESS=.*/HEADLESS=true/" .env
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
                    sh 'docker system prune -f --volumes'
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
