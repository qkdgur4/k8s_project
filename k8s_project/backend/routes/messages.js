const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    name: String, store: String, category: String,
    menu: String, taste: String, mood: String,
    memo: String, recommend: String,
}, {
    timestamps: true,
    collection: 'reviews'
});

const ReviewModel = mongoose.model('Review', reviewSchema);

// CRUD 함수들
const saveReview = async (data) => ReviewModel.create(data);
const getReviews = async (category) => {
    const query = (category && category !== '전체') ? { category } : {};
    return ReviewModel.find(query).sort({ createdAt: -1 });
};
const getReviewById = async (id) => ReviewModel.findById(id);
const updateReview  = async (id, data) => ReviewModel.findByIdAndUpdate(id, data, { new: true });
const deleteReview  = async (id) => ReviewModel.findByIdAndDelete(id);

module.exports = {
    saveReview, getReviews, getReviewById,
    updateReview, deleteReview
};