document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
  
    const username = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
  
    fetch('http://localhost:8000/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('User registered successfully');
        document.getElementById('register-form').reset();
      } else {
        alert('Error registering user');
      }
    });
  });
  
  document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
  
    const username = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
  
    fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Login successful');
        localStorage.setItem('token', data.token);
        document.getElementById('login-form').reset();
        document.getElementById('logout-btn').style.display = 'block';
      } else {
        alert('Invalid credentials');
      }
    });
  });
  
  document.getElementById('logout-btn').addEventListener('click', function() {
    fetch('http://localhost:8000/logout', {
      method: 'POST',
      headers: {
        'Authorization': localStorage.getItem('token')
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert('Logged out successfully');
        localStorage.removeItem('token');
        document.getElementById('logout-btn').style.display = 'none';
      }
    });
  });
  
  // Show logout button if token is present
  if (localStorage.getItem('token')) {
    document.getElementById('logout-btn').style.display = 'block';
  }
  