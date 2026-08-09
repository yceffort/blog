# 최종형: 멀티스테이지 + Next.js standalone 출력만 담는다
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# 2편에서 확인한 함정: 이 줄이 없으면 쿠버네티스가 주입한 HOSTNAME(파드 이름) 때문에 파드 IP에만 바인드된다.
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
