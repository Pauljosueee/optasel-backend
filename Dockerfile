FROM node:18-bullseye

WORKDIR /app

# 🔥 INSTALAR OPENSSL (OBLIGATORIO PARA PRISMA)
RUN apt-get update \
 && apt-get install -y openssl libssl-dev \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
