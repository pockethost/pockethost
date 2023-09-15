FROM alpine:3
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

EXPOSE 8090

CMD ["ls", "-lah", "/host_bin"]