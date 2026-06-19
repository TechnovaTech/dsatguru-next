import { NextResponse } from 'next/server'
import { connectDB } from '../../../../lib/db'
import User from '../../../../lib/models/User'
import { requireRole } from '../../../../lib/auth'
import { STAFF_ROLES, ADMIN_ROLES } from '../../../../lib/constants/roles'
import bcrypt from 'bcryptjs'

export async function GET(request) {
  try {
    const auth = requireRole(request, STAFF_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()

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
      .limit(500)
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
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error

    await connectDB()

    const { name, email, password, role } = await request.json()
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }

    // Check if user already exists (coerce email to a string to block NoSQL injection)
    const existingUser = await User.findOne({ email: String(email).toLowerCase() })
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

