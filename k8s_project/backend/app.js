const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const routeModule = require('./routes');

// 환경 변수 확인
if (!process.env.PORT) {
    throw new Error("PORT environment variable is not defined");
}
if (!process.env.GUESTBOOK_DB_ADDR) {
    throw new Error("GUESTBOOK_DB_ADDR environment variable is not defined");
}

const PORT = process.env.PORT;
const MONGO_URI = process.env.GUESTBOOK_DB_ADDR;

// DB 연결 함수
const connectToMongoDB = () => {
    console.log('Attempting MongoDB connection...');
    mongoose.connect(MONGO_URI)
        .then(() => console.log(`✅ Successfully connected to MongoDB`))
        .catch(err => {
            console.error(`MongoDB connection failed: ${err.message}. Retrying in 5 seconds...`);
            setTimeout(connectToMongoDB, 5000);
        });
};

connectToMongoDB(); // DB 연결 시작

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트 설정
app.use('/api', routeModule); // 🟢 모든 API 경로에 /api 접두사 추가

// 서버 시작
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});

module.exports = app;