FROM node:20 AS build

COPY . /app
WORKDIR /app

RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs20-debian12

COPY --from=build /app /app
WORKDIR /app

EXPOSE 3000
CMD ["main.js"]