FROM node:20-alpine3.18

RUN apk update
RUN apk add --no-cache ca-certificates bash
RUN npm i -g pnpm

RUN adduser -D pocketbase

RUN echo "pocketbase:password" | chpasswd

EXPOSE 8090

WORKDIR /home/pocketbase

CMD ["./pocketbase", "serve", "--http", "0.0.0.0:8090"]
