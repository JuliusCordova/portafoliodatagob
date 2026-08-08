FROM node:22-slim AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-slim AS runner

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

COPY --from=build /app ./

EXPOSE 8080

CMD ["sh", "-c", "npm run start -- -H 0.0.0.0 -p ${PORT:-8080}"]
