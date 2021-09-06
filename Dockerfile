FROM node:16-bullseye-slim

WORKDIR /usr/src/app

COPY rollup.config.js ./
COPY package*.json ./

RUN npm install

COPY ./src ./src
COPY ./public ./public

RUN npm run-script build

EXPOSE 5050

ENV HOST=0.0.0.0

CMD [ "npm", "start" ]