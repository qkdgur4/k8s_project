// 1) 모듈/함수 한 번만 불러오기
const express = require('express');
const {
  saveReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview
} = require('./messages');

const router = express.Router();

// --- '한입로그' 리뷰 API 엔드포인트 ---

/**
 * GET /api/reviews?category=<카테고리명>
 * 목록(카테고리 필터 포함)
 */
router.get('/api/reviews', async (req, res) => {
  const { category } = req.query;
  console.log(`received request: GET /api/reviews, category: ${category || 'All'}`);
  try {
    const reviews = await getReviews(category);
    res.status(200).json(reviews);
  } catch (err) {
    console.error('Error in GET /api/reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /api/reviews
 * 새 리뷰 생성
 */
router.post('/api/reviews', async (req, res) => {
  console.log('received request: POST /api/reviews, body:', req.body);
  try {
    const newReview = await saveReview(req.body);
    res.status(201).json(newReview);
  } catch (err) {
    console.error('Error saving submit data:', err);
    res.status(500).json({ error: 'Server error while saving data' });
  }
});

/**
 * GET /api/reviews/:id
 * 단건 조회(수정 폼 채우기용)
 */
router.get('/api/reviews/:id', async (req, res) => {
  try {
    const doc = await getReviewById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

/**
 * PUT /api/reviews/:id
 * 수정 저장
 */
router.put('/api/reviews/:id', async (req, res) => {
  try {
    const updated = await updateReview(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

/**
 * DELETE /api/reviews/:id
 * 삭제
 */
router.delete('/api/reviews/:id', async (req, res) => {
  try {
    const deleted = await deleteReview(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
