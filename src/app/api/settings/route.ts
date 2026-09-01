import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/settings?category=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    const settings = await db.systemSetting.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    // Convert to key-value map for easier frontend consumption
    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return Response.json({ success: true, data: settings, map: settingsMap });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/settings — Upsert a setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as {
      key?: string;
      value?: string;
      category?: string;
      type?: string;
    };

    const { key, value, category = 'GENERAL', type = 'STRING' } = body;

    if (!key || value === undefined) {
      return Response.json({ success: false, error: 'key and value are required' }, { status: 400 });
    }

    // Check if setting already exists
    const existing = await db.systemSetting.findUnique({
      where: { key },
    });

    let setting;
    if (existing) {
      setting = await db.systemSetting.update({
        where: { key },
        data: { value, category, type },
      });

      await db.auditLog.create({
        data: {
          action: 'SETTING_UPDATE',
          entityType: 'SystemSetting',
          entityId: existing.id,
          previousValue: JSON.stringify({ key: existing.key, value: existing.value }),
          newValue: JSON.stringify({ key, value, category, type }),
        },
      });
    } else {
      setting = await db.systemSetting.create({
        data: { key, value, category, type },
      });

      await db.auditLog.create({
        data: {
          action: 'SETTING_CREATE',
          entityType: 'SystemSetting',
          entityId: setting.id,
          newValue: JSON.stringify({ key, value, category, type }),
        },
      });
    }

    return Response.json({ success: true, data: setting, message: `Setting ${existing ? 'updated' : 'created'} successfully` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
