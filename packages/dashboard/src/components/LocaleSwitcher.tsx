'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { useTransition } from 'react';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale = locale === 'ko' ? 'en' : 'ko';
  const label = locale === 'ko' ? 'EN' : '한';

  function handleSwitch() {
    startTransition(() => {
      router.replace(
        { pathname },
        { locale: otherLocale },
      );
    });
  }

  return (
    <button
      onClick={handleSwitch}
      disabled={isPending}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
      title={routing.locales.find(l => l === otherLocale) === 'en' ? 'Switch to English' : '한국어로 전환'}
    >
      {label}
    </button>
  );
}
