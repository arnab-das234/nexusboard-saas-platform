import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get all users with their roles
    const usersWithRoles = await db.user.findMany({
      where: { isActive: true },
      include: {
        roles: {
          include: { role: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const members = usersWithRoles.map(u => {
      const primaryRole = u.roles[0]?.role?.name || 'STUDENT';
      return {
        id: u.id,
        userId: u.id,
        role: primaryRole,
        joinedAt: u.roles[0]?.assignedAt?.toISOString() ?? u.createdAt.toISOString(),
        taskCount: 0, // Could be enhanced with actual activity counts
        user: {
          id: u.id,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          avatar: u.avatar,
          isActive: u.isActive,
        },
      };
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.email?.trim() || !body.email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    // Check if user already exists
    let user = await db.user.findUnique({ where: { email: body.email } });
    if (!user) {
      const name = body.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      user = await db.user.create({
        data: { email: body.email, passwordHash: 'invited-pending-setup', name },
      });
    }

    // Assign role
    const roleName = body.role || 'STUDENT';
    const role = await db.role.findUnique({ where: { name: roleName } });
    if (role) {
      const existingRole = await db.userRole.findUnique({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
      });
      if (!existingRole) {
        await db.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });
      }
    }

    return NextResponse.json({
      id: user.id,
      userId: user.id,
      role: roleName,
      joinedAt: new Date().toISOString(),
      taskCount: 0,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isActive: user.isActive,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Team POST error:', error);
    return NextResponse.json({ error: 'Failed to invite' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.userId || !body.role) {
      return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
    }

    // Find or create the target role
    let role = await db.role.findUnique({ where: { name: body.role } });
    if (!role) {
      role = await db.role.create({ data: { name: body.role } });
    }

    // Remove existing roles and assign new one
    await db.userRole.deleteMany({ where: { userId: body.userId } });
    await db.userRole.create({
      data: { userId: body.userId, roleId: role.id },
    });

    return NextResponse.json({ success: true, role: body.role });
  } catch (error) {
    console.error('Team PUT error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Deactivate user instead of deleting
    await db.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
