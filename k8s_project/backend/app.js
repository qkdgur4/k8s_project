const express = require('express');
const mongoose = require('mongoose');
const app = express();
//const routes = require('./routes')
const routeModule = require('./routes')
// ✅ [변경] 환경변수 PORT가 없으면 기본값 3000 사용하도록 완화
//    (실습/로컬에서 바로 띄우기 좋게끔)
const PORT = process.env.PORT || 3000;
const messages = require('./routes/messages')
const cors = require('cors') // CORS 처리를 위해 추가

app.use(cors()) // CORS 설정
// ⭐ 폼 데이터를 올바르게 파싱하기 위해 bodyParser 미들웨어 추가 (Express 4.16+ 내장)
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // <-- 이 라인이 폼 데이터를 처리합니다.

// ⭐ 1. HAProxy 헬스 체크 경로 정의 (가장 먼저 라우팅 되어야 합니다!)
app.get('/health', (req, res) => {
    // 200 OK 응답으로 "실행 중"임을 알립니다.
    if (mongoose.connection.readyState === 1) {
      // 1(connected) 상태일 때만 200 OK 응답
      res.status(200).send({ "status": "ok", "db": "ok" });
    } else {
      // 그 외 모든 경우 (연결 중, 끊김 등) 503 Service Unavailable 응답
      res.status(503).send({ "status": "error", "db": "unavailable" });
    }
});

app.use('/', routeModule)

// Application will fail if environment variables are not set
// ✅ [완화] PORT는 위에서 기본값 3000을 사용하므로 종료하지 않고 경고만 표시
if(!process.env.PORT) {
  const errMsg = "PORT environment variable is not defined"
  console.warn(errMsg + " (기본값 3000으로 구동합니다)"); // ← 추가 안내
  // throw new Error(errMsg)  // ← 기본값 사용하므로 더 이상 종료하지 않음
}

if(!process.env.GUESTBOOK_DB_ADDR) {
  const errMsg = "GUESTBOOK_DB_ADDR environment variable is not defined"
  console.error(errMsg)
  throw new Error(errMsg)
}

// Connect to MongoDB, will retry only once
messages.connectToMongoDB()

// Starts an http server on the $PORT environment variable
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app
