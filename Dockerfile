FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Run database migrations (optional - see note below)
# RUN npx prisma migrate deploy

EXPOSE 3000

ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1

CMD ["npx", "tsx", "src/index.ts"]