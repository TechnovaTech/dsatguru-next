const axios = require('axios')

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@dsatmain.com',
      password: 'admin123'
    })
    
    console.log('✅ Login successful!')
    console.log('User:', response.data.user)
    console.log('Token:', response.data.token ? 'Generated' : 'Missing')
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message)
  }
}

testLogin()