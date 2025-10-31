# Dockerfile

# --- 1단계: 빌드 단계 ---
FROM golang:1.22-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사
COPY go.mod go.sum ./
# 의존성 다운로드
RUN go mod download

# 소스 코드 복사
COPY . .

# Go 애플리케이션 빌드 (CGO_ENABLED=0은 정적 바이너리 생성)
RUN CGO_ENABLED=0 GOOS=linux go build -o /main .

# --- 2단계: 최종 실행 단계 ---
FROM alpine:latest

WORKDIR /

# 빌드 단계에서 생성된 실행 파일만 복사
COPY --from=builder /main /main

# 애플리케이션 포트 명시
EXPOSE 8000

# 컨테이너 시작 명령어
CMD ["/main"]
~
