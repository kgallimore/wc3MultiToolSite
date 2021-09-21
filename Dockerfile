FROM node:16-bullseye-slim

WORKDIR /usr/src/app

COPY rollup.config.js ./
COPY package*.json ./

RUN npm install

COPY ./src ./src
COPY ./public ./public
COPY node/src/server.ts ./node/src/
COPY node/*.json ./node/

RUN npm run-script build

RUN cd ./node/ && npm install && cd ..

EXPOSE 5050
EXPOSE 5051

ENV HOST=0.0.0.0

CMD ["npm","run","production"]