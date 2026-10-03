#!/usr/bin/env bash
# Deploy the static Next.js export to S3 + CloudFront from this machine.
#
# Copy deploy/.env.example to deploy/.env and fill in your values.
# Usage:
#   ./deploy/cloudfront.sh                # defaults to build:prod
#   ./deploy/cloudfront.sh dev            # npm run build:dev
#   ./deploy/cloudfront.sh uat            # npm run build:uat
#   ./deploy/cloudfront.sh prod           # npm run build:prod

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/opt/node@22/bin:$PATH"
# AWS CLI v2 pages JSON through `less` by default, which looks like a hang.
export AWS_PAGER=""

ENV_NAME="${1:-prod}"
case "$ENV_NAME" in
  dev)  BUILD_CMD="npm run build:dev" ;;
  uat)  BUILD_CMD="npm run build:uat" ;;
  prod) BUILD_CMD="npm run build:prod" ;;
  *)
    echo "Unknown env: $ENV_NAME (use dev|uat|prod)"
    exit 1
    ;;
esac

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    echo "Loading $file"
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

load_env_file "$ROOT/deploy/.env"
load_env_file "$ROOT/deploy/.env.${ENV_NAME}"

# Empty keys in .env must not override ~/.aws/credentials.
for cred_var in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN; do
  if [[ -z "${!cred_var:-}" ]]; then
    unset "$cred_var"
  fi
done

if [[ ! -f "$ROOT/deploy/.env" && ! -f "$ROOT/deploy/.env.${ENV_NAME}" ]]; then
  echo "Missing deploy/.env. Copy deploy/.env.example to deploy/.env and fill in your values."
  exit 1
fi

: "${S3_BUCKET:?Set S3_BUCKET in deploy/.env}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID in deploy/.env}"
: "${AWS_DEFAULT_REGION:?Set AWS_DEFAULT_REGION in deploy/.env}"

echo "Checking AWS credentials..."
aws sts get-caller-identity --output text
echo "AWS credentials OK."

echo "Installing dependencies..."
npm ci

echo "Building static export ($ENV_NAME)..."
$BUILD_CMD

if [[ ! -f out/index.html ]]; then
  echo "Build failed: out/index.html is missing"
  exit 1
fi

echo "Uploading hashed assets (long cache)..."
aws s3 sync out/_next/static "s3://${S3_BUCKET}/_next/static" \
  --cache-control "public,max-age=31536000,immutable"

echo "Uploading remaining files (short cache, prune stale)..."
aws s3 sync out/ "s3://${S3_BUCKET}" \
  --delete \
  --exclude "_next/static/*" \
  --cache-control "public,max-age=0,must-revalidate"

echo "Invalidating CloudFront..."
aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --paths "/*"

echo "Done. Wait 1–2 minutes, then open the CloudFront URL."
