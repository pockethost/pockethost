FROM node:24-alpine

RUN apk update
RUN apk add --no-cache ca-certificates bash

RUN adduser -D pockethost

RUN echo "pockethost:password" | chpasswd

EXPOSE 8090

WORKDIR /home/pockethost
