import { NextResponse } from 'next/server'
import { connectDB } from '../../../../../lib/db'
import User from '../../../../../lib/models/User'
import { requireRole } from '../../../../../lib/auth'
import { ROLES, ALL_ROLES, ADMIN_ROLES } from '../../../../../lib/constants/roles'
import bcrypt from 'bcryptjs'

export async function PUT(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()

    const { name, email, role, password } = await request.json()

    // Find user
    const user = await User.findById(params.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only a full Admin may change anyone's role or touch an Admin account — otherwise a
    // TutorAdmin could promote itself (or reset an Admin's password).
    const callerIsAdmin = decoded.role === ROLES.ADMIN
    const roleChange = role && role !== user.role
    if (!callerIsAdmin && (user.role === ROLES.ADMIN || roleChange)) {
      return NextResponse.json({ error: 'Only an Admin can change roles or edit Admin accounts' }, { status: 403 })
    }
    if (role && !ALL_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if email is being changed and if it conflicts
    if (email !== user.email) {
      const existingUser = await User.findOne({ email: String(email).toLowerCase() })
      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
    }

    // Update fields
    user.name = name || user.name
    user.email = email || user.email
    user.role = role || user.role

    // Update password if provided
    if (password && password.trim() !== '') {
      user.password = await bcrypt.hash(password, 12)
    }

    await user.save()

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject()
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = requireRole(request, ADMIN_ROLES)
    if (auth.error) return auth.error
    const { decoded } = auth

    await connectDB()

    const user = await User.findById(params.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting the current admin user
    if (user._id.toString() === decoded.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }
    if (user.role === ROLES.ADMIN && decoded.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Only an Admin can delete an Admin account' }, { status: 403 })
    }

    await User.findByIdAndDelete(params.id)
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}