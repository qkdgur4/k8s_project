// "새 리뷰 작성하기" 버튼
const showButton = document.getElementById('show-form-btn');
// "취소" 버튼
const hideButton = document.getElementById('hide-form-btn');
// 숨겨진 폼이 담긴 영역
const formWrapper = document.getElementById('review-form-wrapper');
// 폼 자체
const reviewForm = document.getElementById('new-review-form');

// "새 리뷰 작성하기" 버튼 클릭 이벤트
if (showButton) {
  showButton.addEventListener('click', () => {
    formWrapper.style.display = 'block';
    showButton.style.display = 'none';
  });
}

// "취소" 버튼 클릭 이벤트
if (hideButton) {
  hideButton.addEventListener('click', () => {
    formWrapper.style.display = 'none';
    showButton.style.display = 'block';
  });
}

// 폼 "제출" 이벤트
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
    .then(response => {
      if (response.ok) {
        alert('리뷰가 성공적으로 등록되었습니다!');
        window.location.reload(); // 성공 시 페이지 새로고침
      } else {
        alert('리뷰 등록에 실패했습니다. 다시 시도해주세요.');
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