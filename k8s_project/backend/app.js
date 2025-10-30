const express = require('express');
const mongoose = require('mongoose');
const app = express();
const routeModule = require('./routes');
const cors = require('cors'); // CORS 처리를 위해 추가

// Application will fail if environment variables are not set
if (!process.env.PORT) {
    const errMsg = "PORT environment variable is not defined";
    console.error(errMsg);
    throw new Error(errMsg);
}

if (!process.env.MONGO_URI) {
    const errMsg = "MONGO_URI environment variable is not defined";
    console.error(errMsg);
    throw new Error(errMsg);
}

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

// --- 데이터베이스 연결 ---
const connectToMongoDB = () => {
    console.log('Attempting MongoDB connection...');
    mongoose.connect(MONGO_URI)
        .then(() => console.log(`✅ Successfully connected to MongoDB`))
        .catch(err => {
            console.error(`Initial MongoDB connection failed: ${err.message}. Retrying in 5 seconds...`);
            setTimeout(connectToMongoDB, 5000);
        });
};

connectToMongoDB(); // DB 연결 시작

app.use(cors()); // CORS 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    if (mongoose.connection.readyState === 1) {
        res.status(200).send({ "status": "ok", "db": "ok" });
    } else {
        res.status(503).send({ "status": "error", "db": "unavailable" });
    }
});

app.use('/', routeModule);

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});

module.exports = app;