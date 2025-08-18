FROM node:20-slim AS build
WORKDIR /app
# Actualiza e instala las dependencias del sistema requeridas por Playwright
# RUN apt-get update && apt-get install -y \
#     libnss3 \
#     libatk1.0-0 \
#     libatk-bridge2.0-0 \
#     libcups2 \
#     libxcomposite1 \
#     libxrandr2 \
#     libgbm1 \
#     libasound2 \
#     libpangocairo-1.0-0 \
#     libpango-1.0-0 \
#     libgtk-3-0 \
#     fonts-liberation \
#   && rm -rf /var/lib/apt/lists/*
  
COPY package*.json .
RUN npm install --force
# RUN npx playwright install --with-deps
COPY . .
EXPOSE 3022
CMD [ "npm", "start" ]