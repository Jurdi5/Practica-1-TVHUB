const form = document.querySelector('#auth-form');
const error = document.querySelector('#error');
const endpoint = location.pathname === '/register' ? '/api/auth/register' : '/api/auth/login';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';
  const values = new FormData(form);
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: values.get('email'), password: values.get('password') })
  });
  if (response.ok) { location.href = '/'; return; }
  const body = await response.json();
  error.textContent = body.error?.message ?? 'Could not sign in';
});
