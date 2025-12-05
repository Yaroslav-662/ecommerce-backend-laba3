# Легкий Node образ
FROM node:20-alpine

# Робоча директорія
WORKDIR /app

# Копіюємо package.json та package-lock.json
COPY package*.json ./

# Встановлюємо production-залежності
RUN npm install --production

# Копіюємо весь код
COPY . .

# Створюємо папки uploads та logs
RUN mkdir -p uploads logs

# Виставляємо порт для Render
ENV PORT=5000
EXPOSE 5000

# Старт сервера
CMD ["node", "server.js"]
