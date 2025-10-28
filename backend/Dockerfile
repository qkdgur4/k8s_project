# --- 1단계: 의존성 설치 단계 (Dependency Stage) ---
# 빌드에 필요한 의존성만 별도로 설치합니다.
FROM node:20-alpine AS deps

# 작업 디렉토리 설정
WORKDIR /backend

# package.json과 package-lock.json을 먼저 복사하여 Docker 캐시를 활용합니다.
COPY package*.json ./

# ⭐ [수정] npm ci 대신 npm install을 사용하여 lock 파일 불일치 문제 해결
# 운영(Production)에 필요한 의존성만 설치합니다. (개발용은 제외)
RUN npm install --omit=dev


# --- 2단계: 최종 실행 단계 (Production Stage) ---
# 깨끗한 새 이미지에서 시작하여 최종 이미지를 만듭니다.
FROM node:20-alpine

# ⭐ 핵심: 시작 스크립트에 필요한 netcat과 보안을 위한 sudo 설치
RUN apk add --no-cache netcat-openbsd sudo

# 보안을 위해 root가 아닌 일반 사용자(appuser)를 생성하고 전환합니다.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# 작업 디렉토리 설정
WORKDIR /backend

# 1단계(deps)에서 설치한 node_modules만 복사합니다.
COPY --from=deps /backend/node_modules ./node_modules

# 애플리케이션 소스 코드를 복사합니다. (.dockerignore가 적용됨)
COPY . .

# 애플리케이션이 사용하는 포트를 명시합니다.
EXPOSE 8000

# 컨테이너가 시작될 때 실행할 최종 명령어입니다.
CMD ["node", "--inspect=9229", "app.js"]


