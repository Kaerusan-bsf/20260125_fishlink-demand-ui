import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import bcrypt from 'bcryptjs';
import {prisma} from './prisma';

const SESSION_COOKIE = 'fl_session';

export async function getCurrentUser() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: {id: sessionId},
    include: {user: true}
  });

  return session?.user ?? null;
}

// role は enum ではなく string で扱う（"RESTAURANT" | "FARMER"）
export async function requireUser(locale: string, role?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (role && user.role !== role) {
    redirect(`/${locale}/listings`);
  }
  return user;
}

export async function loginAction(formData: FormData) {
  'use server';
  const locale = String(formData.get('locale') ?? 'ja');
  const role = String(formData.get('role') ?? '');
  const userId = String(formData.get('userId') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!userId || !password || !role) {
    redirect(`/${locale}/login?error=missing`);
  }

  const user = await prisma.user.findUnique({where: {userId}});
  if (!user) {
    redirect(`/${locale}/login?error=invalid`);
  }

  if (user.role !== role) {
    redirect(`/${locale}/login?error=role`);
  }

  // ★ここが今回の本丸：passwordHash -> password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    redirect(`/${locale}/login?error=invalid`);
  }

  const sessionId = crypto.randomUUID();
  await prisma.session.create({
    data: {id: sessionId, userId: user.id}
  });

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  redirect(`/${locale}/listings`);
}

export async function logoutAction(formData: FormData) {
  'use server';
  const locale = String(formData.get('locale') ?? 'ja');
  const cookieStore = cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await prisma.session.deleteMany({where: {id: sessionId}});
    cookieStore.delete(SESSION_COOKIE);
  }

  redirect(`/${locale}/login`);
}
