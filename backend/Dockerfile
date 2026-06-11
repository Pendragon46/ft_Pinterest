FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache bash git curl

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]