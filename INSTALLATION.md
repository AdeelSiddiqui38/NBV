# NBV CRM - Installation Guide

This guide provides step-by-step instructions for installing and setting up the NBV CRM system.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Installation Steps](#installation-steps)
4. [Database Setup](#database-setup)
5. [Configuration](#configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

- **OS**: Linux (Ubuntu 18.04+), macOS (10.14+), or Windows 10+
- **Node.js**: 14.0.0 or higher
- **npm**: 6.0.0 or higher
- **RAM**: 2GB minimum
- **Disk Space**: 5GB minimum free space
- **Network**: Stable internet connection for initial setup

### Recommended Requirements

- **OS**: Ubuntu 20.04 LTS or CentOS 8
- **Node.js**: 16.x or 18.x LTS
- **npm**: 8.x or higher
- **RAM**: 4GB or more
- **Disk Space**: 10GB or more free space
- **Database**: PostgreSQL 12+

### Optional Components

- **Docker**: 20.10+ (for containerized deployment)
- **Git**: 2.30+ (for version control)
- **Nginx**: For reverse proxy and load balancing

## Pre-Installation Checklist

Before starting the installation, verify:

- [ ] Node.js and npm are installed and updated
- [ ] PostgreSQL (or MySQL) is installed and running
- [ ] Port 3000 is available (or you can configure another port)
- [ ] You have admin/sudo access on the system
- [ ] Your system has adequate disk space
- [ ] Firewall rules allow necessary connections

### Check Installation Status

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check PostgreSQL version (if installed)
psql --version
```

## Installation Steps

### Step 1: Extract the ZIP File

```bash
# Navigate to your desired directory
cd /opt  # or your preferred location

# Extract the CRM package
unzip nbv-crm-deploy-ready.zip

# Navigate to the application directory
cd nbv-crm
```

### Step 2: Install Node Dependencies

```bash
# Install dependencies
npm install

# Or using yarn (if preferred)
yarn install

# Verify installation
npm list
```

### Step 3: Create Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit the configuration
nano .env  # or use your preferred editor
```

### Step 4: Configure Database

```bash
# Create database (PostgreSQL example)
createdb nbv_crm

# Create database user
createuser -P crm_user  # You'll be prompted for a password
```

Update your `.env` file with the database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nbv_crm
DB_USER=crm_user
DB_PASSWORD=your_secure_password
```

### Step 5: Initialize Database

```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### Step 6: Start the Application

```bash
# Development environment
npm run dev

# Production environment
npm start
```

The application should now be running at `http://localhost:3000`.

## Database Setup

### PostgreSQL Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nbv_crm;

# Create user
CREATE USER crm_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE nbv_crm TO crm_user;

# Exit
\q
```

### MySQL Setup

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE nbv_crm;

# Create user
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON nbv_crm.* TO 'crm_user'@'localhost';

# Flush privileges
FLUSH PRIVILEGES;

# Exit
EXIT;
```

## Configuration

### Essential Configuration Variables

Create a `.env` file in the root directory with the following variables:

```env
# Environment
NODE_ENV=development

# Server
PORT=3000
HOST=localhost

# Database
DB_TYPE=postgres              # or mysql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nbv_crm
DB_USER=crm_user
DB_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=7d

# API Keys
API_KEY=your_api_key_here
STRIPE_KEY=your_stripe_key     # If using payment processing

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
MAIL_FROM=noreply@nextbridgeventures.com

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Security
CORS_ORIGIN=http://localhost:3000
SESSION_SECRET=your_session_secret
```

### Optional Configuration

```env
# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS Integration (if applicable)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760     # 10MB in bytes
```

## Verification

### Test the Installation

```bash
# Check if the server is running
curl http://localhost:3000/api/health

# Expected response:
# {"status":"OK","timestamp":"2026-06-15T10:00:00Z"}

# Test database connection
npm run test:db

# Run all tests
npm test
```

### Access the Application

1. Open your web browser
2. Navigate to `http://localhost:3000`
3. Log in with default credentials (if provided)
4. Verify all features are working

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in .env
PORT=3001
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
sudo service postgresql status

# Test connection
psql -h localhost -U crm_user -d nbv_crm -c "SELECT 1"

# Check .env credentials match
cat .env | grep DB_
```

### Dependency Installation Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Permission Denied Errors

```bash
# Fix ownership
sudo chown -R $USER:$USER ./nbv-crm

# Fix permissions
chmod -R 755 ./nbv-crm
```

### Memory Issues

If you encounter "out of memory" errors:

```bash
# Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

## Next Steps

After successful installation:

1. Review [CONFIGURATION.md](./CONFIGURATION.md) for advanced setup
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
3. Check [API.md](./API.md) for API documentation
4. Review [SECURITY.md](./SECURITY.md) for security best practices

## Getting Help

If you encounter issues:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review logs in `logs/` directory
3. Contact support at support@nextbridgeventures.com

---

**Installation Guide Version:** 1.0.0  
**Last Updated:** June 2026
