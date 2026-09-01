import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!workspace) return NextResponse.json([]);

    const projects = await db.project.findMany({
      where: { workspaceId: workspace.id },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects.map(p => ({
      ...p,
      taskCount: p._count.tasks,
      _count: undefined,
    })));
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const count = await db.project.count({ where: { workspaceId: workspace.id } });
    const key = `NEX-${String(count + 1).padStart(3, '0')}`;

    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: body.name,
        key,
        description: body.description,
        priority: body.priority || 'MEDIUM',
        budget: body.budget,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: { workspaceId: workspace.id, userId: workspace.ownerId, action: 'CREATED', entityType: 'PROJECT', entityId: project.id },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Projects POST error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const project = await db.project.update({ where: { id: body.id }, data: { status: body.status } });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Projects PUT error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Projects DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
