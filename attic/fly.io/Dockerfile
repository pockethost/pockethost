FROM alpine:latest

RUN apk add -v build-base
RUN apk add -v go 
RUN apk add -v ca-certificates

ARG PB_VERSION=0.7.4

RUN apk add --no-cache \
    unzip \
    # this is needed only if you want to use scp to copy later your pb_data locally
    openssh

# Copy your custom PocketBase and build
COPY ./pocketbase-custom /pb
WORKDIR /pb
RUN go get github.com/pocketbase/pocketbase
RUN go build
WORKDIR /

EXPOSE 8080

# start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
