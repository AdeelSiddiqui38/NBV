# NBV CRM - Configuration Guide

This guide covers all configuration options and advanced setup for the NBV CRM system.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Database Configuration](#database-configuration)
3. [Authentication & Security](#authentication--security)
4. [Email Configuration](#email-configuration)
5. [File Upload Configuration](#file-upload-configuration)
6. [API Configuration](#api-configuration)
7. [Caching Configuration](#caching-configuration)
8. [Advanced Configuration](#advanced-configuration)

## Environment Variables

### Core Configuration

```env
# Application Name
APP_NAME=NBV CRM

# Environment (development, staging, production)
NODE_ENV=production

# Server Configuration
PORT=3000
HOST=0.0.0.0
BASE_URL=https://crm.nextbridgeventures.com
```

### Complete .env Template

```env
# ============================================
# APPLICATION SETTINGS
# ============================================
NODE_ENV=production
APP_NAME=NBV CRM
APP_VERSION=1.0.0
DEBUG=false

# ============================================
# SERVER SETTINGS
# ============================================
PORT=3000
HOST=0.0.0.0
BASE_URL=https://crm.nextbridgeventures.com
TIMEZONE=UTC

# ============================================
# DATABASE SETTINGS
# ============================================
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nbv_crm
DB_USER=crm_user
DB_PASSWORD=your_secure_password
DB_LOGGING=false
DB_SYNCHRONIZE=false
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=10000

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
JWT_SECRET=your_very_long_jwt_secret_minimum_32_characters_here
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRATION=30d

SESSION_SECRET=your_session_secret_here
SESSION_TIMEOUT=3600000

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# ============================================
# CORS & SECURITY
# ============================================
CORS_ORIGIN=https://crm.nextbridgeventures.com,https://admin.nextbridgeventures.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_ALLOWED_HEADERS=Content-Type,Authorization

HELMET_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# SSL/TLS CONFIGURATION
# ============================================
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/nbv-crm.crt
SSL_KEY_PATH=/etc/ssl/private/nbv-crm.key
SSL_CA_PATH=/etc/ssl/certs/ca-bundle.crt

# ============================================
# REDIS CACHE
# ============================================
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0
CACHE_TTL=3600

# ============================================
# EMAIL CONFIGURATION
# ============================================
MAIL_DRIVER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
MAIL_FROM=noreply@nextbridgeventures.com
MAIL_FROM_NAME=NBV CRM

# Alternative: Use service like SendGrid, Mailgun, etc.
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.mailgun.org

# ============================================
# FILE UPLOAD
# ============================================
UPLOAD_DRIVER=local
UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=10485760
ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# AWS S3 Configuration
S3_ENABLED=false
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_BUCKET=nbv-crm-uploads
AWS_URL=https://s3.amazonaws.com

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_PATH=./logs
LOG_MAX_FILES=14

# ============================================
# MONITORING & ERROR TRACKING
# ============================================
SENTRY_ENABLED=true
SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_ENVIRONMENT=production

DATADOG_ENABLED=false
DATADOG_API_KEY=your_datadog_key
DATADOG_SITE=datadoghq.com

# ============================================
# PAYMENT PROCESSING (Optional)
# ============================================
STRIPE_ENABLED=false
STRIPE_PUBLIC_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# ============================================
# FEATURE FLAGS
# ============================================
FEATURE_NEW_DASHBOARD=true
FEATURE_ADVANCED_REPORTING=true
FEATURE_CUSTOM_FIELDS=true
FEATURE_AUTOMATION=true

# ============================================
# API CONFIGURATION
# ============================================
API_KEY=your_api_key_here
API_RATE_LIMIT=1000
API_TIMEOUT=30000
API_VERSION=v1

# Third-party integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
ZAPIER_API_KEY=your_zapier_key
```

## Database Configuration

### PostgreSQL Configuration

```env
DB_TYPE=postgres
DB_HOST=db.example.com
DB_PORT=5432
DB_NAME=nbv_crm
DB_USER=crm_user
DB_PASSWORD=secure_password
DB_LOGGING=false
DB_SYNCHRONIZE=false
DB_MAX_CONNECTIONS=10
```

### MySQL Configuration

```env
DB_TYPE=mysql
DB_HOST=db.example.com
DB_PORT=3306
DB_NAME=nbv_crm
DB_USER=crm_user
DB_PASSWORD=secure_password
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci
```

### Connection Pooling

```env
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=30000
```

## Authentication & Security

### JWT Configuration

```env
# Secret must be at least 32 characters
JWT_SECRET=abcd1234efgh5678ijkl9012mnop3456

# Token expiration
JWT_EXPIRATION=7d          # 7 days
JWT_EXPIRATION_SECONDS=604800

# Refresh token
JWT_REFRESH_SECRET=zyxw9876tsrq5432pqno1234mlkj8765
JWT_REFRESH_EXPIRATION=30d
```

### Session Configuration

```env
SESSION_SECRET=your_session_secret_minimum_32_characters_long
SESSION_TIMEOUT=3600000    # 1 hour in milliseconds
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict
```

### OAuth2 Configuration

```env
# Google OAuth
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=https://crm.nextbridgeventures.com/auth/google/callback

# GitHub OAuth
GITHUB_ENABLED=false
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
GITHUB_CALLBACK_URL=https://crm.nextbridgeventures.com/auth/github/callback
```

### Password Policy

```env
# Minimum length
PASSWORD_MIN_LENGTH=8

# Require uppercase
PASSWORD_REQUIRE_UPPERCASE=true

# Require numbers
PASSWORD_REQUIRE_NUMBERS=true

# Require special characters
PASSWORD_REQUIRE_SPECIAL=false

# Expiration days (0 = no expiration)
PASSWORD_EXPIRATION_DAYS=0

# History - cannot reuse last N passwords
PASSWORD_HISTORY_COUNT=3
```

## Email Configuration

### SMTP Configuration

```env
MAIL_DRIVER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_AUTH_USER=apikey
SMTP_AUTH_PASSWORD=your_sendgrid_api_key
MAIL_FROM=noreply@nextbridgeventures.com
MAIL_FROM_NAME=NBV CRM
```

### Email Templates

Create email templates in `src/templates/emails/`:

- `welcome.html` - Welcome email
- `password-reset.html` - Password reset link
- `order-confirmation.html` - Order confirmation
- `notification.html` - General notifications

### Email Queue

```env
# Use Bull for email queue
QUEUE_DRIVER=bull
REDIS_URL=redis://localhost:6379

# Or use database queue
QUEUE_DRIVER=database
```

## File Upload Configuration

### Local File Storage

```env
UPLOAD_DRIVER=local
UPLOAD_PATH=./uploads
MAX_UPLOAD_SIZE=10485760     # 10MB
MAX_UPLOAD_FILES=10

# Allowed file types
ALLOWED_EXTENSIONS=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif
ALLOWED_MIME_TYPES=application/pdf,image/jpeg,image/png,text/plain
```

### AWS S3 Configuration

```env
UPLOAD_DRIVER=s3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_BUCKET=nbv-crm-uploads
AWS_ACL=private

# S3 URL format
S3_URL=https://s3.amazonaws.com
S3_CUSTOM_DOMAIN=files.nextbridgeventures.com
```

### Azure Blob Storage

```env
UPLOAD_DRIVER=azure
AZURE_STORAGE_ACCOUNT=your_account
AZURE_STORAGE_KEY=your_key
AZURE_STORAGE_CONTAINER=nbv-crm-uploads
AZURE_STORAGE_URL=https://your_account.blob.core.windows.net
```

## API Configuration

### API Keys

```env
API_KEY=your_api_key_minimum_32_characters_long
API_SECRET=your_api_secret_minimum_32_characters_long

# Rate limiting
API_RATE_LIMIT=1000
API_RATE_LIMIT_WINDOW_MS=900000   # 15 minutes

# Timeout
API_TIMEOUT=30000                  # 30 seconds
API_REQUEST_SIZE_LIMIT=50mb

# Versioning
API_VERSION=v1
API_VERSION_HEADER=X-API-Version
```

### CORS Configuration

```env
CORS_ENABLED=true
CORS_ORIGIN=https://crm.nextbridgeventures.com,https://app.nextbridgeventures.com
CORS_CREDENTIALS=true
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-API-Key
CORS_EXPOSED_HEADERS=X-Total-Count,X-Page-Count
CORS_MAX_AGE=86400
```

## Caching Configuration

### Redis Caching

```env
CACHE_DRIVER=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
CACHE_TTL=3600                     # 1 hour
CACHE_KEY_PREFIX=nbv_crm
```

### Cache Key Patterns

```env
# User cache
CACHE_USER_TTL=1800                # 30 minutes

# Report cache
CACHE_REPORT_TTL=3600              # 1 hour

# API response cache
CACHE_API_TTL=300                  # 5 minutes
```

## Advanced Configuration

### Request Logging

```env
REQUEST_LOG_ENABLED=true
REQUEST_LOG_LEVEL=debug
REQUEST_LOG_EXCLUDE_PATHS=/health,/metrics,/public
REQUEST_LOG_EXCLUDE_HEADERS=Authorization,Cookie
REQUEST_LOG_BODY_SIZE=5000
```

### CORS Preflight

```env
CORS_PREFLIGHT_CONTINUE=false
CORS_OPTIONS_SUCCESS_STATUS=200
```

### Compression

```env
COMPRESSION_ENABLED=true
COMPRESSION_LEVEL=6
COMPRESSION_THRESHOLD=1000
```

### Security Headers

```env
HELMET_ENABLED=true
HELMET_CONTENT_SECURITY_POLICY=true
HELMET_FRAME_OPTIONS=DENY
HELMET_HSTS_MAX_AGE=31536000
HELMET_HSTS_INCLUDE_SUBDOMAINS=true
```

### Timezone Configuration

```env
TZ=UTC
TIMEZONE=UTC

# For different regions
# TZ=America/New_York
# TZ=Europe/London
# TZ=Asia/Tokyo
```

---

**Configuration Guide Version:** 1.0.0  
**Last Updated:** June 2026
