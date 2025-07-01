# Nginx Logging Configuration for Label Studio

## Problem

Nginx logs noisy informational messages that clutter logs:

```
2025/06/10 13:31:37 [info] 19#19: *61086 client 35.191.206.51 closed keepalive connection
```

## Solution

Control nginx error log level with the `NGINX_ERROR_LOG_LEVEL` environment variable.

**Default**: `warn` (filters out noisy keepalive messages)

**Available levels**: `debug`, `info`, `notice`, `warn`, `error`, `crit`, `alert`, `emerg`

## Usage

### Docker Compose
```yaml
services:
  nginx:
    environment:
      - NGINX_ERROR_LOG_LEVEL=warn  # Recommended: filters keepalive noise
```

### Other levels
- `debug` or `info` - Includes noisy keepalive messages
- `warn` - **Recommended default** (filters out keepalive noise)  
- `error` - Only actual errors

## Note

Access logs are already in JSON format. Error logs use standard nginx format and cannot be changed to JSON.