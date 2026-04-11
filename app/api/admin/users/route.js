import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { getTokenFromRequest, verifyToken } from '../../../../lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || !['Admin', 'TutorAdmin', 'Tutor'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get role filter from query params
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role')
    
    // Build query
    const query = {}
    if (roleFilter) {
      query.role = roleFilter
    }
    
    // If user is Tutor role, only show students assigned to them
    if (decoded.role === 'Tutor' && roleFilter === 'Student') {
      query.assignedTutors = decoded.userId
    }
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .select('-password')
      .populate('assignedTutors', 'name email')
      .lean()
    
    // If fetching tutors, add student count for each
    if (roleFilter === 'Tutor') {
      const usersWithCounts = await Promise.all(users.map(async (user) => {
        const studentCount = await User.countDocuments({ assignedTutors: user._id })
        return { ...user, studentCount }
      }))
      return NextResponse.json(usersWithCounts)
    }
    
    // Transform students to include assignedTutorDetails array
    const transformedUsers = users.map(user => ({
      ...user,
      assignedTutorDetails: (user.assignedTutors || []).map(t => ({ name: t.name, email: t.email }))
    }))
    
    return NextResponse.json(transformedUsers)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    await connectDB()
    const token = getTokenFromRequest(request)
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, email, password, role } = await request.json()
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'Student',
      isActive: true
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject()
    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

