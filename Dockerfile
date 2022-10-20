# https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

# docker run -it --rm -p 8502:8502 validator-monitor

# Build container
# -----------------------------------------------------------------------------------------
FROM node:lts-alpine3.16

# add git, otherwise npm install fails!
# RUN apk add --no-cache git

# Create app directory
WORKDIR /usr/app/src

# Install app dependencies
COPY package.json ./
COPY yarn.lock ./

RUN yarn

# Bundle app source
COPY . .
COPY .env.docker .env

RUN yarn build

EXPOSE 8502

CMD ["node", "dist/main.js"]
