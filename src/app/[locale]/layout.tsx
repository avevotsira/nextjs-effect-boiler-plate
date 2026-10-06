import type { Metadata } from "next";
import localFont from "next/font/local";

import { Toaster } from "@/components/ui/sonner";

import "../globals.css";
import QueryProvider from "@/providers/react-query";

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const khmerDigital = localFont({
  src: [
    {
      path: "../../assets/fonts/KhmerDigital-Black.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../assets/fonts/KhmerDigital-Thin.ttf",
      weight: "100",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "App",
    template: "%s | App",
  },
};

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const { locale } = params;
  const { children } = props;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={khmerDigital.className}>
        <QueryProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
