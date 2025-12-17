FROM node:20-bullseye

WORKDIR /app

# 🔥 INSTALAR OPENSSL (OBLIGATORIO PARA PRISMA)
RUN apt-get update \
 && apt-get install -y openssl libssl-dev \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

# Copiar estructura paso a paso para asegurar que todos los archivos se incluyan
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
