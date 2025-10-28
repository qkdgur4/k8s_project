const mongoose = require('mongoose');

// 환경 변수에서 MongoDB 주소를 가져옵니다.
const GUESTBOOK_DB_ADDR = process.env.GUESTBOOK_DB_ADDR;
const mongoURI = `mongodb://${GUESTBOOK_DB_ADDR}/guestbook`;

const db = mongoose.connection;

// --- 데이터베이스 연결 이벤트 핸들러 ---
db.on('disconnected', () => {
    // 연결이 끊겼을 때 경고 메시지를 표시합니다. 재연결은 connectToMongoDB 함수 내에서 처리됩니다.
    console.warn(`Disconnected: MongoDB connection lost.`);
});
db.on('error', (err) => {
    // 연결 중 발생하는 다른 오류들을 로깅합니다.
    console.error(`MongoDB connection error: ${err}`);
});
db.once('open', () => {
    // 연결이 성공적으로 수립되면 한 번만 실행됩니다.
    console.log(`✅ Successfully connected to ${mongoURI}`);
});

/**
 * [수정됨] 데이터베이스에 연결하는 함수 (연결 실패 시 5초마다 재시도)
 */
const connectToMongoDB = () => {
    console.log('Attempting MongoDB connection...');
    mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: 10000, // 연결 시도 타임아웃
        serverSelectionTimeoutMS: 10000 // 서버 선택 타임아웃
    }).catch(err => {
        // 초기 연결 실패 시 에러를 로깅하고 5초 후에 재시도합니다.
        console.error(`Initial MongoDB connection failed: ${err.message}. Retrying in 5 seconds...`);
        setTimeout(connectToMongoDB, 5000);
    });
};


// --- '한입로그' 리뷰 스키마 및 모델 정의 ---
// home.pug의 폼 필드와 일치하는 데이터 구조를 정의합니다.
const reviewSchema = new mongoose.Schema({
    name: String,      // 작성자 이름
    store: String,     // 가게명
    category: String,  // 음식 분류
    menu: String,      // 먹은 음식
    taste: String,     // 맛 평점
    mood: String,      // 분위기
    memo: String,      // 추가 메모
    recommend: String, // 추천 여부
}, {
    timestamps: true, // createdAt, updatedAt 필드를 자동으로 추가합니다.
    collection: 'reviews' // 데이터베이스에 'reviews'라는 이름의 컬렉션으로 저장합니다.
});

const ReviewModel = mongoose.model('Review', reviewSchema);


// --- 데이터베이스 CRUD 함수 ---

/**
 * 새로운 리뷰 데이터를 저장하는 함수
 * @param {object} data - 저장할 리뷰 데이터
 * @returns {Promise<Document>} - 저장된 리뷰 문서
 */
const saveReview = async (data) => {
    try {
        const newReview = await ReviewModel.create(data);
        console.log('✅ New review data saved:', newReview.store);
        return newReview;
    } catch (error) {
        console.error("Error saving review data:", error);
        throw error; // 오류가 발생하면 상위 호출자에게 전파합니다.
    }
};

/**
 * [수정됨] 모든 리뷰 또는 특정 카테고리의 리뷰를 조회하는 함수 (최신순)
 * @param {string} [category] - 조회할 카테고리 (옵션)
 * @returns {Promise<Array<Document>>} - 조회된 리뷰 문서 배열
 */
const getReviews = async (category) => {
    try {
        let query = {};
        // 'category' 파라미터가 존재하고 '전체'가 아닐 경우, 쿼리에 필터 조건 추가
        if (category && category !== '전체') {
            query.category = category;
        }
        
        // createdAt 필드를 기준으로 내림차순 정렬하여 최신 글이 위로 오게 합니다.
        const reviews = await ReviewModel.find(query).sort({ createdAt: -1 });
        return reviews;
    } catch (error) {
        console.error("Error fetching reviews:", error);
        throw error;
    }
};

// 외부에서 사용할 수 있도록 함수들을 내보냅니다.
module.exports = {
    connectToMongoDB: connectToMongoDB,
    saveReview: saveReview,
    getReviews: getReviews // 기존 getAllReviews 대신 getReviews를 내보냅니다.
};

