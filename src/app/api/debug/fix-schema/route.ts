import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
      ADD COLUMN IF NOT EXISTS telegram_username TEXT,
      ADD COLUMN IF NOT EXISTS telegram_opt_in BOOLEAN DEFAULT FALSE;
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Schema updated successfully: Added telegram columns to profiles table' 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
