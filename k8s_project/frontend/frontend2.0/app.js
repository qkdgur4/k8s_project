const express = require('express');
const axios = require('axios'); // 백엔드와 통신하기 위한 라이브러리
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
// GUESTBOOK_API_ADDR 환경변수를 사용하여 백엔드(proxy) 주소를 설정합니다.
const API_ADDR = process.env.GUESTBOOK_API_ADDR;

// Pug 템플릿 엔진 설정
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일(css, js) 경로 설정
app.use(express.static(path.join(__dirname, 'public')));

// 폼 데이터 파싱을 위한 미들웨어
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// GET / : 메인 페이지 렌더링
// 백엔드에서 리뷰 목록을 가져와서 home.pug 템플릿에 전달합니다.
app.get('/', async (req, res) => {
    try {
        if (!API_ADDR) {
            throw new Error('GUESTBOOK_API_ADDR 환경 변수가 설정되지 않았습니다.');
        }
        // 백엔드의 GET /api/reviews API를 호출합니다.
        const response = await axios.get(`http://${API_ADDR}/api/reviews`);
        // 받은 데이터를 'reviews'라는 변수명으로 템플릿에 전달합니다.
        // list.pug에서 이 'reviews' 변수를 사용하게 됩니다.
        res.render('home', { reviews: response.data });
    } catch (error) {
        console.error('Error fetching reviews from backend:', error.message);
        // 오류 발생 시 빈 배열을 전달하여 페이지가 깨지지 않도록 합니다.
        res.render('home', { reviews: [] });
    }
});

// POST /submit : 폼 데이터를 받아서 백엔드로 전달
app.post('/submit', async (req, res) => {
    try {
        if (!API_ADDR) {
            throw new Error('GUESTBOOK_API_ADDR 환경 변수가 설정되지 않았습니다.');
        }
        // home.pug 폼에서 받은 데이터를 백엔드의 POST /api/reviews API로 전달합니다.
        await axios.post(`http://${API_ADDR}/api/reviews`, req.body);
        // 성공적으로 전달 후, 메인 페이지로 리다이렉트하여 목록을 갱신합니다.
        res.redirect('/');
    } catch (error) {
        console.error('Error submitting review to backend:', error.message);
        res.status(500).send('리뷰를 제출하는 중 서버 오류가 발생했습니다.');
    }
});

// === 새 창 작성 라우트 ===
// 작성 폼(새 창)
app.get('/reviews/new', (req, res) => {
  // 필요하면 쿼리로 초기값을 전달할 수도 있음 (예: ?store=XXX)
  res.render('new', {});
});

// 작성 저장(새 창에서 submit → 프론트가 백엔드에 전달 후 창 닫기)
app.post('/reviews', async (req, res) => {
  try {
    if (!API_ADDR) throw new Error('GUESTBOOK_API_ADDR 환경 변수가 설정되지 않았습니다.');
    await axios.post(`http://${API_ADDR}/api/reviews`, req.body);
    // 부모 창 새로고침 후 팝업 닫기
    res.send(`<script> if (window.opener) { window.opener.location.reload(); } window.close(); </script>`);
  } catch (e) {
    console.error('popup create error:', e.message);
    res.status(500).send('저장 실패: ' + e.message);
  }
});

// === 새 창 수정 라우트 ===
// 수정 폼(새 창, 기존 값 채우기)
app.get('/reviews/:id/edit', async (req, res) => {
  try {
    if (!API_ADDR) throw new Error('GUESTBOOK_API_ADDR 환경 변수가 설정되지 않았습니다.');
    const { data } = await axios.get(`http://${API_ADDR}/api/reviews/${req.params.id}`);
    res.render('edit', { review: data });
  } catch (e) {
    console.error('popup edit load error:', e.message);
    res.status(500).send('불러오기 실패: ' + e.message);
  }
});

// 수정 저장(새 창에서 submit → 프론트가 백엔드에 PUT 중계 후 창 닫기)
app.post('/reviews/:id', async (req, res) => {
  try {
    if (!API_ADDR) throw new Error('GUESTBOOK_API_ADDR 환경 변수가 설정되지 않았습니다.');
    await axios.put(`http://${API_ADDR}/api/reviews/${req.params.id}`, req.body);
    res.send(`<script> if (window.opener) { window.opener.location.reload(); } window.close(); </script>`);
  } catch (e) {
    console.error('popup edit save error:', e.message);
    res.status(500).send('수정 실패: ' + e.message);
  }
});

app.listen(PORT, () => {
    console.log(`Frontend service listening on port ${PORT}`);
});


