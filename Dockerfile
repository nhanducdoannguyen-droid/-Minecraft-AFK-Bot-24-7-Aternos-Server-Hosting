FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

# HuggingFace Spaces mặc định dùng port 7860
EXPOSE 7860
ENV PORT=7860

CMD ["npm", "start"]
