FROM node:18-alpine as buildbox
COPY --from=golang:1.19-alpine /usr/local/go/ /usr/local/go/
ENV PATH="/usr/local/go/bin:${PATH}"
RUN apk add python3 py3-pip make gcc musl-dev g++ bash
# WORKDIR /src

# COPY packages/pocketbase/src packages/pocketbase/src
# WORKDIR /src/packages/pocketbase/src
# RUN go get

# WORKDIR /src
# COPY packages/common/package.json packages/common/
# COPY packages/daemon/package.json packages/daemon/
# COPY packages/daemon/yarn.lock packages/daemon/
# COPY packages/pockethost.io/package.json packages/pockethost.io/
# COPY packages/pockethost.io/yarn.lock packages/pockethost.io/
# COPY package.json ./
# COPY yarn.lock ./
# RUN yarn
# COPY . .
# RUN yarn build
# RUN ls -lah node_modules
