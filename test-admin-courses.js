// Test script to verify admin courses API
const testAdminCoursesAPI = async () => {
  try {
    // First, let's test if we can create an admin user
    console.log('Testing admin courses API...')
    
    // Test GET courses (should require auth)
    const response = await fetch('http://localhost:3000/api/admin/courses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('GET /api/admin/courses status:', response.status)
    const data = await response.json()
    console.log('Response:', data)
    
    if (response.status === 401) {
      console.log('✅ Authentication is working - unauthorized access blocked')
    } else {
      console.log('❌ Authentication might not be working properly')
    }
    
  } catch (error) {
    console.error('Error testing API:', error)
  }
}

// Run the test
testAdminCoursesAPI()