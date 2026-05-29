import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const VALID_LOCALES = ["ro", "en"] as const;
type Locale = (typeof VALID_LOCALES)[number];

function isValid(l: string | undefined): l is Locale {
  return VALID_LOCALES.includes(l as Locale);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale = isValid(raw) ? raw : "ro";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
