// 0) MongoDB 연결 준비
const mongoose = require('mongoose');

const GUESTBOOK_DB_ADDR = process.env.GUESTBOOK_DB_ADDR;
const mongoURI = `mongodb://${GUESTBOOK_DB_ADDR}/guestbook`;
const db = mongoose.connection;

db.on('disconnected', () => console.warn('Disconnected: MongoDB connection lost.'));
db.on('error', (err) => console.error(`MongoDB connection error: ${err}`));
db.once('open', () => console.log(`✅ Successfully connected to ${mongoURI}`));

const connectToMongoDB = () => {
  console.log('Attempting MongoDB connection...');
  mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000
  }).catch(err => {
    console.error(`Initial MongoDB connection failed: ${err.message}. Retrying in 5 seconds...`);
    setTimeout(connectToMongoDB, 5000);
  });
};

// 1) 스키마 & 모델
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

// 2) CRUD 함수들
const saveReview = async (data) => {
  const newReview = await ReviewModel.create(data);
  console.log('✅ New review data saved:', newReview.store);
  return newReview;
};

const getReviews = async (category) => {
  const query = (category && category !== '전체') ? { category } : {};
  return ReviewModel.find(query).sort({ createdAt: -1 });
};

const getReviewById = async (id) => ReviewModel.findById(id);

const updateReview  = async (id, data) =>
  ReviewModel.findByIdAndUpdate(id, data, { new: true });

const deleteReview  = async (id) => ReviewModel.findByIdAndDelete(id);

// 3) ✨ export는 한 번만!
module.exports = {
  connectToMongoDB,
  saveReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview
};
