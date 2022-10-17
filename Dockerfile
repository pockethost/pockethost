FROM node:18-alpine as buildbox
COPY --from=golang:1.19-alpine /usr/local/go/ /usr/local/go/
ENV PATH="/usr/local/go/bin:${PATH}"
RUN --mount=type=cache,target=/var/cache/apk  --mount=type=cache,target=/var/lib/apk apk add python3 py3-pip make gcc musl-dev g++
WORKDIR /src
COPY . .
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn/v6 --mount=type=cache,target=node_modules --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build yarn && yarn build
