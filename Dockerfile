FROM node:18-alpine as build-stage
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV production
RUN npm run build


FROM node:18-alpine as deployment-stage
WORKDIR /usr/src/app
COPY --from=build-stage /usr/src/app/node_modules ./node_modules
COPY --from=build-stage /usr/src/app/dist ./dist
CMD ["node", "dist/main.js"]
