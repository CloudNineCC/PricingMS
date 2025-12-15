#!/bin/bash

set -e

VM_NAME="microservice"
VM_ZONE="us-central1-c"
PROJECT_ID="cloudnine-475221"
SERVICE_NAME="pricing-ms"
SSH_KEY_FILE="${SSH_KEY_FILE:-$HOME/.ssh/databasesql}"

echo "Deploying ${SERVICE_NAME} to VM ${VM_NAME}..."

# Create remote directory
echo "Creating remote directory..."
gcloud compute ssh --ssh-key-file=${SSH_KEY_FILE} ${VM_NAME} \
  --zone=${VM_ZONE} \
  --project=${PROJECT_ID} \
  --command="mkdir -p ~/${SERVICE_NAME}"

# Copy source files
echo "Copying source files..."
gcloud compute scp --ssh-key-file=${SSH_KEY_FILE} \
  --recurse src/ ${VM_NAME}:~/${SERVICE_NAME}/ \
  --zone=${VM_ZONE} \
  --project=${PROJECT_ID}

# Copy package files
gcloud compute scp --ssh-key-file=${SSH_KEY_FILE} \
  package*.json tsconfig.json ${VM_NAME}:~/${SERVICE_NAME}/ \
  --zone=${VM_ZONE} \
  --project=${PROJECT_ID}

# Copy .env file
echo "Copying environment configuration..."
gcloud compute scp --ssh-key-file=${SSH_KEY_FILE} \
  .env ${VM_NAME}:~/${SERVICE_NAME}/ \
  --zone=${VM_ZONE} \
  --project=${PROJECT_ID}

# Build and start service on VM
echo "Building and starting service..."
gcloud compute ssh --ssh-key-file=${SSH_KEY_FILE} ${VM_NAME} \
  --zone=${VM_ZONE} \
  --project=${PROJECT_ID} \
  --command="
    cd ~/${SERVICE_NAME}
    npm ci
    npm run build

    # Load environment variables and start with PM2
    pm2 delete ${SERVICE_NAME} 2>/dev/null || true
    pm2 start dist/server.js --name ${SERVICE_NAME} --env-file .env --update-env
    pm2 save
  "

echo "✓ ${SERVICE_NAME} deployed successfully!"
echo "Check status: gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE} --command='pm2 status'"
