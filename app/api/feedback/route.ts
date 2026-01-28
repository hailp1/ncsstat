import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { recordTokenTransaction } from '@/lib/token-service';
import { POINTS_CONFIG } from '@/lib/points-config';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const body = await req.json();
        const { type, message, page_url } = body;

        if (!type || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Insert feedback
        const { error: insertError } = await supabase
            .from('user_feedback')
            .insert({
                user_id: user?.id || null,
                type,
                message,
                page_url: page_url || null,
            });

        if (insertError) {
            console.error('Feedback insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to submit feedback' },
                { status: 500 }
            );
        }

        // Award tokens if user is logged in
        let rewardResult = null;
        if (user) {
            // Check if user has already submitted feedback recently to prevent spamming?
            // For now, let's just award it. Or maybe limit it.
            // Let's award it for every feedback to encourage it, but maybe small amount.
            // Config is 50. That's generous. Let's assume 1 per day logic is complex for now.
            // We fully trust the strategy "Góp ý hay - Nhận ngay Token".

            rewardResult = await recordTokenTransaction(
                user.id,
                POINTS_CONFIG.FEEDBACK,
                'earn_feedback',
                'Feedback Reward'
            );
        }

        return NextResponse.json({
            success: true,
            rewarded: !!rewardResult?.success,
            points: POINTS_CONFIG.FEEDBACK
        });

    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
