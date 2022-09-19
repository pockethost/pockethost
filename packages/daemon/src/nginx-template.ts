import { Port, Subdomain } from '@pockethost/common/src/schema'

export const NGINX_TEMPLATE = (subdomain: Subdomain, port: Port) => `

### BEGIN ${subdomain}:${port} ###
server {
  listen       443 ssl;
  server_name  ${subdomain}.pockethost.io;

  ssl_certificate     /etc/letsencrypt/live/${subdomain}.pockethost.io/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${subdomain}.pockethost.io/privkey.pem;

  access_log  /home/pockethost/data/${subdomain}/logs/access.log;
  error_log  /home/pockethost/data/${subdomain}/logs/error.log;

  location / {
      proxy_read_timeout 180s;

      # WebSocket support
      proxy_buffering off; # For realtime
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";

      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;

      proxy_pass http://127.0.0.1:${port};
  }
}
### END ${subdomain}:${port} ###

`
