// ===================================================================
// MINESWEEPER CLONE - AUTOMATED ENTERPRISE CI/CD PIPELINE
// GitHub -> Jenkins -> Docker -> Terraform -> Ansible -> K3s Cluster
// ===================================================================

pipeline {
    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    environment {
        // Docker Configuration
        DOCKER_REGISTRY       = 'docker.io'
        DOCKER_REPO           = 'devopsdemo/minesweeper-clone'
        DOCKER_CREDENTIALS_ID = 'dockerhub-credentials'

        // AWS & Infrastructure Configuration
        AWS_CREDENTIALS_ID    = 'aws-credentials'
        AWS_DEFAULT_REGION    = 'us-east-1'

        // SSH & Kubernetes Credentials
        SSH_KEY_CREDENTIALS_ID = 'k3s-ssh-key'
        KUBECONFIG_PATH        = "${WORKSPACE}/kubeconfig"

        // Dynamic Tagging Variables
        SHORT_GIT_SHA         = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : 'manual'}"
        IMAGE_TAG_BUILD       = "build-${env.BUILD_NUMBER}"

        // Flags
        IS_PULL_REQUEST       = "${env.CHANGE_ID != null || env.BRANCH_NAME?.startsWith('PR-')}"
        IS_MAIN_BRANCH        = "${env.BRANCH_NAME == 'main' || env.GIT_BRANCH == 'origin/main'}"
    }

    stages {
        // ----------------------------------------------------
        // Stage 1: Checkout Source Code
        // ----------------------------------------------------
        stage('Checkout Source Code') {
            steps {
                echo "==> Checking out repository commit: ${env.GIT_COMMIT ?: 'HEAD'}"
                checkout scm
            }
        }

        // ----------------------------------------------------
        // Stage 2: Install Node.js Dependencies
        // ----------------------------------------------------
        stage('Install Dependencies') {
            steps {
                dir('app') {
                    echo "==> Installing Node.js test dependencies..."
                    sh 'npm ci --quiet || npm install --quiet'
                }
            }
        }

        // ----------------------------------------------------
        // Stage 3: Static Code Analysis & Linting
        // ----------------------------------------------------
        stage('Static & Lint Analysis') {
            steps {
                dir('app') {
                    echo "==> Running static code analysis..."
                    sh 'npm run lint'
                }
            }
        }

        // ----------------------------------------------------
        // Stage 4: Automated Unit Tests
        // ----------------------------------------------------
        stage('Execute Unit Tests') {
            steps {
                dir('app') {
                    echo "==> Running Jest unit test suite with coverage thresholds..."
                    sh 'npm run test:coverage'
                }
            }
        }

        // ----------------------------------------------------
        // Stage 5: Multi-Stage Docker Build
        // ----------------------------------------------------
        stage('Docker Build') {
            steps {
                echo "==> Building multi-stage Docker image..."
                sh """
                    docker build \
                        -t ${DOCKER_REPO}:latest \
                        -t ${DOCKER_REPO}:${SHORT_GIT_SHA} \
                        -t ${DOCKER_REPO}:${IMAGE_TAG_BUILD} \
                        -f Dockerfile .
                """
            }
        }

        // ----------------------------------------------------
        // Stage 6: Docker Smoke Test & Container Health Probe
        // ----------------------------------------------------
        stage('Docker Smoke Test') {
            steps {
                echo "==> Launching ephemeral container for pre-flight smoke testing..."
                sh '''
                    # Stop existing test container if running
                    docker rm -f minesweeper-test-container 2>/dev/null || true

                    # Run container in background on ephemeral port
                    docker run -d --name minesweeper-test-container -p 8089:80 "${DOCKER_REPO}:latest"

                    # Await container boot
                    sleep 3

                    # Probe health check endpoint
                    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8089/healthz || echo "000")

                    # Destroy ephemeral test container
                    docker rm -f minesweeper-test-container

                    if [ "$HTTP_STATUS" -ne 200 ]; then
                        echo "[!] Docker smoke test failed with HTTP status: $HTTP_STATUS"
                        exit 1
                    fi
                    echo "==> Docker smoke test passed (HTTP 200 OK)."
                '''
            }
        }

        // ----------------------------------------------------
        // Stage 7: Docker Login & Push (Main & Develop Branches Only)
        // ----------------------------------------------------
        stage('Push Docker Images') {
            when {
                expression { return !Boolean.valueOf(env.IS_PULL_REQUEST) }
            }
            steps {
                echo "==> Authenticating to Docker Hub and publishing images..."
                withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push "${DOCKER_REPO}:latest"
                        docker push "${DOCKER_REPO}:${SHORT_GIT_SHA}"
                        docker push "${DOCKER_REPO}:${IMAGE_TAG_BUILD}"
                        docker logout
                    '''
                }
            }
        }

        // ----------------------------------------------------
        // Stage 8: Terraform Infrastructure Provisioning (Main Branch)
        // ----------------------------------------------------
        stage('Terraform Provisioning') {
            when {
                expression { return Boolean.valueOf(env.IS_MAIN_BRANCH) }
            }
            steps {
                dir('terraform') {
                    echo "==> Initializing and provisioning AWS infrastructure via Terraform..."
                    withCredentials([[
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: env.AWS_CREDENTIALS_ID,
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]]) {
                        sh '''
                            terraform init -no-color
                            terraform validate -no-color
                            terraform plan -no-color -out=tfplan
                            terraform apply -no-color -auto-approve tfplan
                        '''
                    }
                }
            }
        }

        // ----------------------------------------------------
        // Stage 9: Bootstrap K3s Cluster via Ansible (Main Branch)
        // ----------------------------------------------------
        stage('Ansible K3s Cluster Setup') {
            when {
                expression { return Boolean.valueOf(env.IS_MAIN_BRANCH) }
            }
            steps {
                dir('ansible') {
                    echo "==> Configuring EC2 instances and bootstrapping K3s cluster via Ansible..."
                    withCredentials([sshUserPrivateKey(credentialsId: env.SSH_KEY_CREDENTIALS_ID, keyFileVariable: 'SSH_PRIVATE_KEY_PATH', usernameVariable: 'SSH_USER')]) {
                        sh '''
                            export ANSIBLE_HOST_KEY_CHECKING=False
                            ansible-playbook \
                                -i inventory/hosts.ini \
                                --private-key "${SSH_PRIVATE_KEY_PATH}" \
                                --user "${SSH_USER:-ubuntu}" \
                                playbooks/site.yml
                        '''
                    }
                }
            }
        }

        // ----------------------------------------------------
        // Stage 10: Kubernetes Zero-Downtime Deployment (Main Branch)
        // ----------------------------------------------------
        stage('Kubernetes Deployment') {
            when {
                expression { return Boolean.valueOf(env.IS_MAIN_BRANCH) }
            }
            steps {
                echo "==> Deploying Minesweeper application to K3s cluster..."
                sh """
                    export KUBECONFIG="${KUBECONFIG_PATH}"
                    export IMAGE_TAG="${SHORT_GIT_SHA}"
                    ./scripts/deploy.sh
                """
            }
        }

        // ----------------------------------------------------
        // Stage 11: Post-Deployment Verification & Health Check
        // ----------------------------------------------------
        stage('Post-Deploy Health Check') {
            when {
                expression { return Boolean.valueOf(env.IS_MAIN_BRANCH) }
            }
            steps {
                echo "==> Running end-to-end Kubernetes and HTTP health checks..."
                sh """
                    export KUBECONFIG="${KUBECONFIG_PATH}"
                    ./scripts/health-check.sh
                """
            }
        }
    }

    // ----------------------------------------------------
    // Post-Execution Handling & Notifications
    // ----------------------------------------------------
    post {
        success {
            echo "============================================================"
            echo " [SUCCESS] CI/CD Pipeline completed successfully!"
            echo " Branch: ${env.BRANCH_NAME} | Commit: ${SHORT_GIT_SHA}"
            echo " Application running at: http://minesweeper.local"
            echo "============================================================"
        }
        failure {
            echo "============================================================"
            echo " [FAILURE] CI/CD Pipeline encountered an error!"
            echo " Triggering safety rollback if Kubernetes deployment failed..."
            echo "============================================================"
            script {
                if (Boolean.valueOf(env.IS_MAIN_BRANCH)) {
                    sh '''
                        export KUBECONFIG="${KUBECONFIG_PATH}"
                        echo "==> Rolling back Kubernetes deployment to previous stable revision..."
                        kubectl rollout undo deployment/minesweeper -n minesweeper || true
                    '''
                }
            }
        }
        always {
            echo "==> Pipeline workspace cleanup completed."
            cleanWs(deleteDirs: true, notFailBuild: true, patterns: [[pattern: 'kubeconfig', type: 'INCLUDE']])
        }
    }
}
