const mongoose = require('mongoose');

// --- '한입로그' 리뷰 스키마 및 모델 정의 ---
const reviewSchema = new mongoose.Schema({
    name: String,
    store: String,
    category: String,
    menu: String,
    taste: String,
    mood: String,
    memo: String,
    recommend: String,
}, {
    timestamps: true,
    collection: 'reviews'
});

const ReviewModel = mongoose.model('Review', reviewSchema);


// --- 데이터베이스 CRUD 함수 ---
const saveReview = async (data) => {
    const newReview = await ReviewModel.create(data);
    console.log('✅ New review data saved:', newReview.store);
    return newReview;
};

const getReviews = async (category) => {
    let query = {};
    if (category && category !== '전체') {
        query.category = category;
    }
    const reviews = await ReviewModel.find(query).sort({ createdAt: -1 });
    return reviews;
};

const getReviewById = async (id) => ReviewModel.findById(id);
const updateReview  = async (id, data) => ReviewModel.findByIdAndUpdate(id, data, { new: true });
const deleteReview  = async (id) => ReviewModel.findByIdAndDelete(id);

// 외부에서 사용할 수 있도록 함수들을 내보냅니다.
module.exports = {
    saveReview,
    getReviews,
    getReviewById,
    updateReview,
    deleteReview
};