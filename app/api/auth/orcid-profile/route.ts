import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { strictRateLimit, getClientIP } from '@/utils/rate-limit';

// Force dynamic to prevent build-time env var access
export const dynamic = 'force-dynamic';

// Rate limiting for ORCID profile creation - use strict limiter
const limiter = strictRateLimit;

/**
 * API Route để tạo/cập nhật profile cho ORCID users
 * 
 * ORCID users không cần auth.users entry, chỉ tạo profiles với UUID
 */

// Lazy-init Supabase admin client to avoid build-time errors
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
    if (!_supabaseAdmin) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl) {
            throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
        }
        if (!supabaseKey) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
        }

        _supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        });
    }
    return _supabaseAdmin;
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const identifier = getClientIP(request);
        const { success } = await limiter.check(5, identifier); // 5 requests per minute per IP
        
        if (!success) {
            return NextResponse.json(
                { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { orcid, name, email } = body;

        console.log('[ORCID Profile API] Creating/updating profile:', { orcid, name, email });

        // Input validation
        if (!orcid || !email) {
            return NextResponse.json(
                { error: 'ORCID và email là bắt buộc' },
                { status: 400 }
            );
        }

        // Validate ORCID format (0000-0000-0000-0000)
        const orcidRegex = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
        if (!orcidRegex.test(orcid)) {
            return NextResponse.json(
                { error: 'ORCID ID không hợp lệ' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Email không hợp lệ' },
                { status: 400 }
            );
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Check if profile already exists with this email
        console.log('[ORCID Profile API] Checking for existing profile by email');
        const { data: existingByEmail, error: emailCheckError } = await supabaseAdmin
            .from('profiles')
            .select('id, orcid_id, full_name')
            .eq('email', email)
            .single();

        if (emailCheckError && emailCheckError.code !== 'PGRST116') {
            console.error('[ORCID Profile API] Database error checking email:', emailCheckError);
            return NextResponse.json(
                { error: 'Lỗi cơ sở dữ liệu' },
                { status: 500 }
            );
        }

        if (existingByEmail) {
            console.log('[ORCID Profile API] Found existing profile by email, updating with ORCID');
            
            // Update existing profile with ORCID
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    orcid_id: orcid,
                    full_name: name || existingByEmail.full_name,
                    last_active: new Date().toISOString(),
                })
                .eq('id', existingByEmail.id);

            if (updateError) {
                console.error('[ORCID Profile API] Update profile error:', updateError);
                return NextResponse.json(
                    { error: 'Không thể cập nhật profile' },
                    { status: 500 }
                );
            }

            console.log('[ORCID Profile API] Profile updated successfully');

            return NextResponse.json({
                success: true,
                message: 'Profile đã được cập nhật với ORCID',
                profileId: existingByEmail.id,
                isExisting: true
            });
        }

        // Check if profile exists with this ORCID
        console.log('[ORCID Profile API] Checking for existing profile by ORCID');
        const { data: existingByOrcid, error: orcidCheckError } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('orcid_id', orcid)
            .single();

        if (orcidCheckError && orcidCheckError.code !== 'PGRST116') {
            console.error('[ORCID Profile API] Database error checking ORCID:', orcidCheckError);
            return NextResponse.json(
                { error: 'Lỗi cơ sở dữ liệu' },
                { status: 500 }
            );
        }

        if (existingByOrcid) {
            console.log('[ORCID Profile API] Found existing profile by ORCID');
            
            // Update last_active
            await supabaseAdmin
                .from('profiles')
                .update({ last_active: new Date().toISOString() })
                .eq('id', existingByOrcid.id);

            return NextResponse.json({
                success: true,
                message: 'ORCID user đã tồn tại',
                profileId: existingByOrcid.id,
                isExisting: true
            });
        }

        console.log('[ORCID Profile API] Creating new profile for ORCID user');

        // Create new profile for ORCID user - SIMPLIFIED APPROACH
        // Use crypto.randomUUID() instead of creating dummy auth user
        const profileId = crypto.randomUUID();
        
        // Get default balance for new users
        const { data: defaultBalanceConfig } = await supabaseAdmin
            .from('system_config')
            .select('value')
            .eq('key', 'default_ncs_balance')
            .single();
        
        const defaultBalance = defaultBalanceConfig?.value || 100000;

        // Create profile directly with UUID
        const { data: newProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: profileId,
                orcid_id: orcid,
                email: email,
                full_name: name,
                display_name: name,
                tokens: defaultBalance,
                created_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
                provider: 'orcid'
            })
            .select()
            .single();

        if (profileError) {
            console.error('[ORCID Profile API] Create profile error:', profileError);
            return NextResponse.json(
                { error: 'Không thể tạo profile: ' + profileError.message },
                { status: 500 }
            );
        }

        console.log('[ORCID Profile API] Profile created successfully:', profileId);

        // Log the new user creation
        await supabaseAdmin
            .from('activity_logs')
            .insert({
                user_id: profileId,
                action: 'user_registered',
                details: { provider: 'orcid', orcid_id: orcid },
                created_at: new Date().toISOString()
            });

        return NextResponse.json({
            success: true,
            message: 'Profile đã được tạo thành công',
            profileId: profileId,
            userId: profileId,
            isExisting: false,
            // Return profile data for immediate use
            profile: {
                id: profileId,
                orcid_id: orcid,
                email: email,
                full_name: name,
                tokens: defaultBalance
            }
        });

    } catch (error: any) {
        console.error('[ORCID Profile API] Unexpected error:', error);
        return NextResponse.json(
            { error: error.message || 'Đã xảy ra lỗi' },
            { status: 500 }
        );
    }
}
