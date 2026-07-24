FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache bash curl netcat-openbsd

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]