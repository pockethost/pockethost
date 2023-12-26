FROM node:20-alpine3.18

RUN apk update
RUN apk add --no-cache ca-certificates bash
RUN npm i -g pnpm

RUN adduser -D pockethost

RUN echo "pockethost:password" | chpasswd

EXPOSE 8090

WORKDIR /home/pockethost

