# my-react-app/backend/Dockerfile

# 1) Node + Debian 리눅스
FROM node:22-bullseye

# 2) Python 3.9 설치 (ML용) - Debian bullseye 기본 버전
RUN apt-get update && apt-get install -y \
    python3 python3-venv python3-pip \
    build-essential curl && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

# 3) 작업 디렉토리
WORKDIR /app

# 4) Node 의존성 설치
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      echo "package-lock.json found, running npm ci..." && \
      npm ci || (echo "npm ci failed, falling back to npm install..." && npm install); \
    else \
      echo "package-lock.json not found, running npm install..." && \
      npm install; \
    fi

# 5) 전체 백엔드 코드 복사 (ml 폴더 포함)
COPY . .

# 6) Python 패키지 설치 (numpy / sklearn / pandas)
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir \
      numpy==1.26.4 \
      scikit-learn==1.5.2 \
      pandas

# 7) ML 파이썬 경로 환경변수
ENV ML_PYTHON_BIN=/usr/bin/python
ENV NODE_ENV=production

# 8) 백엔드가 사용하는 포트 (server.js에서 사용하는 포트)
EXPOSE 3000

# 9) 서버 실행
CMD ["node", "server.js"]
