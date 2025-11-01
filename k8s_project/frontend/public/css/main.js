// frontend/public/main.js (최종 완성본)

// 폼 "제출" 이벤트
const reviewForm = document.getElementById('new-review-form');
if (reviewForm) {
  reviewForm.addEventListener('submit', (event) => {
    event.preventDefault(); // 기본 새로고침 동작 방지

    const formData = new FormData(reviewForm);
    const data = Object.fromEntries(formData.entries());

    // 백엔드 API로 데이터 전송
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    .then(async response => { // 🟢 async 추가
      if (response.ok) {
        alert('리뷰가 성공적으로 등록되었습니다!');
        // 🟢 페이지 새로고침 대신, URL을 / 로 변경하여 목록으로 돌아갑니다.
        window.location.href = '/'; 
      } else {
        // 🟢 백엔드에서 보낸 에러 메시지를 표시
        const errorData = await response.json();
        alert('리뷰 등록 실패: ' + (errorData.error || '서버 응답 오류'));
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('서버와 통신 중 오류가 발생했습니다.');
    });
  });
}

// 삭제 함수
async function deleteReview(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  try {
    const response = await fetch(`/api/reviews/${id}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      alert('삭제되었습니다!');
      window.location.reload();
    } else {
      alert('삭제 실패: 서버 응답 오류');
    }
  } catch (err) {
    alert('삭제 중 오류 발생: ' + err.message);
  }
}