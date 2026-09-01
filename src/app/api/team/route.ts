import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!workspace) return NextResponse.json([]);

    const members = await db.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, isActive: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    const membersWithTasks = await Promise.all(members.map(async (m) => {
      const taskCount = await db.task.count({ where: { assigneeId: m.userId } });
      return { ...m, taskCount };
    }));

    return NextResponse.json(membersWithTasks);
  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    // Check if user already exists
    let user = await db.user.findUnique({ where: { email: body.email } });
    if (!user) {
      // Create a placeholder user
      const name = body.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      user = await db.user.create({
        data: { email: body.email, passwordHash: 'invited', name },
      });
    }

    // Check if already a member
    const existing = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } } });
    if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });

    const member = await db.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: body.role || 'MEMBER' },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Team POST error:', error);
    return NextResponse.json({ error: 'Failed to invite' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const member = await db.workspaceMember.findFirst({ where: { userId: body.userId, workspaceId: workspace.id } });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const updated = await db.workspaceMember.update({ where: { id: member.id }, data: { role: body.role } });
    return NextResponse.json(updated);
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

    const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const member = await db.workspaceMember.findFirst({ where: { userId, workspaceId: workspace.id } });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    await db.workspaceMember.delete({ where: { id: member.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
