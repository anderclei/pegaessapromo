import { NextResponse } from 'next/server';
import { groupPoolService } from '@/lib/bots/group-pools';

export async function GET() {
  try {
    const pools = groupPoolService.getAllPools();
    return NextResponse.json({ success: true, pools });
  } catch (error) {
    console.error('API Error (GET /bots/groups):', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();
    console.log(`[GroupsAPI] Action: ${action}`, payload);

    switch (action) {
      case 'createPool': {
        const newPool = groupPoolService.createPool(payload.category);
        return NextResponse.json({ success: true, pool: newPool });
      }
      
      case 'deletePool': {
        const deleted = groupPoolService.deletePool(payload.poolId);
        return NextResponse.json({ success: deleted });
      }

      case 'addGroup': {
        const poolWithNewGroup = groupPoolService.addGroupToPool(payload.poolId, payload.group);
        if (!poolWithNewGroup) return NextResponse.json({ success: false, error: 'Pool not found' }, { status: 404 });
        return NextResponse.json({ success: true, pool: poolWithNewGroup });
      }

      case 'updateGroup': {
        const poolWithUpdatedGroup = groupPoolService.updateGroupInPool(payload.poolId, payload.groupId, payload.updates);
        if (!poolWithUpdatedGroup) return NextResponse.json({ success: false, error: 'Pool or Group not found' }, { status: 404 });
        return NextResponse.json({ success: true, pool: poolWithUpdatedGroup });
      }

      case 'removeGroup': {
        const poolWithoutGroup = groupPoolService.removeGroupFromPool(payload.poolId, payload.groupId);
        if (!poolWithoutGroup) return NextResponse.json({ success: false, error: 'Pool not found' }, { status: 404 });
        return NextResponse.json({ success: true, pool: poolWithoutGroup });
      }

      case 'findAvailableGroup': {
        const availableGroup = groupPoolService.findAvailableGroup(payload.category);
        if (!availableGroup) return NextResponse.json({ success: false, error: 'No groups available for this category' }, { status: 404 });
        return NextResponse.json({ success: true, group: availableGroup });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error (POST /bots/groups):', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
