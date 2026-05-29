import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getUser() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return allCookies },
          setAll() {},
        },
      }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (e) {
    console.error('getUser error:', e)
    return null
  }
}