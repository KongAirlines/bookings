FROM node:20 AS build

COPY . /app
WORKDIR /app

RUN npm ci --omit=dev

FROM gcr.io/distroless/nodejs20-debian12

COPY --from=build /app /app
WORKDIR /app

EXPOSE 8084
CMD ["main.js","8084"]
