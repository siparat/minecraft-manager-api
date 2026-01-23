FROM mcr.microsoft.com/playwright:v1.57.0-noble AS build
WORKDIR /opt/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run generate
RUN npm run build

FROM mcr.microsoft.com/playwright:v1.57.0-noble
WORKDIR /opt/app
COPY package*.json ./
RUN npm ci --omit=dev
RUN npx playwright install-deps
RUN npx playwright install
COPY --from=build /opt/app/dist ./dist
COPY --from=build /opt/app/prisma ./prisma
COPY --from=build /opt/app/generated ./generated
EXPOSE 3000
CMD ["npm", "run", "start:prod"]