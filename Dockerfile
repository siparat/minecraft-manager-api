FROM node:24-alpine AS build
WORKDIR /opt/app
ADD *.json ./
RUN npm ci
ADD . .
RUN npm run generate
RUN npm run build

FROM node:24-alpine
WORKDIR /opt/app
ADD package*.json ./
RUN npm ci --omit=dev
COPY --from=build /opt/app/generated ./
COPY --from=build /opt/app/dist ./
CMD ["npm", "run", "start:prod"]
EXPOSE 3000