FROM alpine:3.18

RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

RUN adduser -D pocketbase

RUN echo "pocketbase:password" | chpasswd

EXPOSE 8090

WORKDIR /home/pocketbase

CMD ["./pocketbase", "serve", "--http", "0.0.0.0:8090"]
