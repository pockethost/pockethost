FROM node:20.9.0-alpine3.18
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

EXPOSE 3000

WORKDIR /host_app
CMD ["node", "index.mjs"]
