# Nginx Logging Configuration for Label Studio

This document explains how to configure nginx logging in Label Studio to reduce noise and customize log output.

## Problem

By default, nginx logs many informational messages that can be noisy in production environments, such as:

```
2025/06/10 13:31:37 [info] 19#19: *61086 client 35.191.206.51 closed keepalive connection
```

These messages are logged at the `info` level and can clutter your logs without providing much value in most cases.

## Solution

Label Studio now supports configurable nginx error logging through environment variables:

### Environment Variables

#### `NGINX_ERROR_LOG_LEVEL`
Controls the nginx error log level. Available options:
- `debug` - All messages (most verbose, includes keepalive noise)
- `info` - Informational messages (includes keepalive connection messages)
- `notice` - Normal but significant condition
- `warn` - Warning conditions (recommended default, filters out keepalive noise)
- `error` - Error conditions only
- `crit` - Critical conditions
- `alert` - Action must be taken immediately
- `emerg` - System is unusable

**Default**: `warn` (filters out noisy keepalive messages)

#### `NGINX_ERROR_LOG_JSON`
Enables JSON format for error logs (currently not supported by nginx error_log directive).
- `true` - Request JSON format (falls back to standard format with note)
- `false` - Use standard nginx error log format

**Default**: `false`

**Note**: While nginx access logs support JSON format (and Label Studio uses this), nginx error logs don't support custom formats. This option is provided for future compatibility.

## Usage Examples

### Docker Compose

#### Basic: Reduce noisy logs (recommended)
```yaml
services:
  nginx:
    # ... other configuration ...
    environment:
      - NGINX_ERROR_LOG_LEVEL=warn  # Filters out keepalive messages
```

#### Advanced: Error-level logging only
```yaml
services:
  nginx:
    # ... other configuration ...
    environment:
      - NGINX_ERROR_LOG_LEVEL=error  # Only actual errors
```

#### Debug: All messages (for troubleshooting)
```yaml
services:
  nginx:
    # ... other configuration ...
    environment:
      - NGINX_ERROR_LOG_LEVEL=debug  # All messages including noise
```

### Docker Run

```bash
docker run -e NGINX_ERROR_LOG_LEVEL=warn heartexlabs/label-studio:latest nginx
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: label-studio-nginx
spec:
  template:
    spec:
      containers:
      - name: nginx
        image: heartexlabs/label-studio:latest
        env:
        - name: NGINX_ERROR_LOG_LEVEL
          value: "warn"
        - name: NGINX_ERROR_LOG_JSON
          value: "false"
```

## Log Levels Comparison

| Level | Keepalive Messages | Typical Use Case |
|-------|-------------------|------------------|
| `debug` | ✅ Included (noisy) | Development/debugging |
| `info` | ✅ Included (noisy) | Detailed monitoring |
| `notice` | ❌ Filtered out | Normal operation with notices |
| `warn` | ❌ Filtered out | **Recommended default** |
| `error` | ❌ Filtered out | Production (errors only) |
| `crit` | ❌ Filtered out | Critical issues only |

## Current Logging Setup

Label Studio already uses JSON format for access logs with the `json_detailed` format, which includes:
- HTTP request details
- Response codes and timing
- Client information
- Network metrics
- Request IDs for tracing

Error logs use the standard nginx format but can now be controlled via the `NGINX_ERROR_LOG_LEVEL` environment variable.

## Migration Guide

### From noisy logs to clean logs:
1. Add `NGINX_ERROR_LOG_LEVEL=warn` to your environment variables
2. Restart your Label Studio nginx container
3. Verify that keepalive messages are no longer appearing in error logs

### For debugging:
1. Temporarily set `NGINX_ERROR_LOG_LEVEL=debug`
2. Reproduce the issue
3. Collect logs
4. Set back to `warn` for normal operation

## Troubleshooting

### Still seeing keepalive messages?
- Verify that `NGINX_ERROR_LOG_LEVEL` is set to `warn` or higher
- Check that the environment variable is properly passed to the nginx container
- Restart the container after changing the environment variable

### Missing important error messages?
- If you set the level too high (e.g., `crit`), you might miss important errors
- Consider using `error` as a middle ground
- Use `warn` as the recommended default

### Checking current configuration:
Look for these messages in the container startup logs:
```
=> Configuring nginx error logging...
=> Valid log level: warn
=> Setting error log level to: warn
=> Note: Log level 'warn' filters out noisy 'client closed keepalive connection' messages
```

## Related Files

- `deploy/default.conf` - Main nginx configuration
- `deploy/docker-entrypoint.d/nginx/10-configure-nginx.sh` - Nginx configuration script
- `docker-compose.yml` - Example environment variable configuration