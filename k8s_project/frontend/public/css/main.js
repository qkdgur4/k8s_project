// frontend/public/main.js (최종 완성본 - Auth 추가)

document.addEventListener('DOMContentLoaded', () => {
    // 폼/버튼 선택
    const reviewForm = document.getElementById('new-review-form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // --- 1. 로그인 상태에 따라 수정/삭제 버튼 제어 ---
    const loggedInUserId = localStorage.getItem('userId');
    if (loggedInUserId) {
        document.querySelectorAll('.review-actions').forEach(actions => {
            const authorId = actions.getAttribute('data-author-id');
            if (authorId === loggedInUserId) {
                // 본인 글이면 수정/삭제 버튼 표시
                const editBtn = actions.querySelector('.edit-btn');
                const deleteBtn = actions.querySelector('.delete-btn');
                if (editBtn) editBtn.style.display = 'inline-block';
                if (deleteBtn) deleteBtn.style.display = 'inline-block';
            }
        });
    }

    // --- 2. 헬퍼 함수: API 요청 ---
    async function apiRequest(endpoint, method, body, requiresAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        if (requiresAuth) {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('인증이 필요합니다. 다시 로그인해주세요.');
                window.location.href = '/login';
                return;
            }
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(endpoint, {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 401 || response.status === 403) {
            // 토큰이 만료되었거나 권한이 없음
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            alert('세션이 만료되었거나 권한이 없습니다. 다시 로그인해주세요.');
            window.location.href = '/login';
        }
        
        return response;
    }

    // --- 3. 회원가입 폼 제출 ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            const response = await apiRequest('/register', 'POST', data);

            if (response.ok) {
                alert('회원가입 성공! 이제 로그인해주세요.');
                history.pushState(null, '', '/login');
                window.location.reload(); // 폼 상태 업데이트를 위해
            } else {
                const errorData = await response.json();
                alert('회원가입 실패: ' + (errorData.error || '서버 오류'));
            }
        });
    }

    // --- 4. 로그인 폼 제출 ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            const response = await apiRequest('/login', 'POST', data);

            if (response.ok) {
                const result = await response.json();
                // 🟢 토큰과 사용자 정보를 localStorage에 저장
                localStorage.setItem('token', result.token);
                localStorage.setItem('userId', result.userId);
                localStorage.setItem('username', result.username);
                alert('로그인 성공!');
                window.location.href = '/'; // 메인 페이지로 이동
            } else {
                const errorData = await response.json();
                alert('로그인 실패: ' + (errorData.error || '서버 오류'));
            }
        });
    }

    // --- 5. 새 리뷰 폼 제출 ---
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(reviewForm);
            const tags = formData.getAll('tags');
            const data = Object.fromEntries(formData.entries());
            data.tags = tags;
            
            if (tags.length === 0) {
              alert('태그를 1개 이상 선택해주세요!');
              return;
            }

            // 🟢 /api/reviews로 인증(신분증)과 함께 요청
            const response = await apiRequest('/api/reviews', 'POST', data, true);

            if (response.ok) {
                alert('리뷰가 성공적으로 등록되었습니다!');
                window.location.href = '/';
            } else {
                const errorData = await response.json();
                alert('리뷰 등록 실패: ' + (errorData.error || '서버 응답 오류'));
            }
        });
    }
});

// --- 6. 삭제 함수 (이제 전역 함수여야 함) ---
async function deleteReview(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    // 🟢 apiRequest 헬퍼 함수를 사용할 수 없으므로, 직접 토큰을 추가
    const token = localStorage.getItem('token');
    if (!token) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch(`/api/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('삭제되었습니다!');
            window.location.reload();
        } else {
            const errorData = await response.json();
            alert('삭제 실패: ' + (errorData.error || '서버 응답 오류'));
            if(response.status === 401 || response.status === 403) {
              window.location.href = '/login';
            }
        }
    } catch (err) {
        alert('삭제 중 오류 발생: ' + err.message);
    }
}