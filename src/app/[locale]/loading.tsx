import { useTranslations } from "next-intl";

export default function Loading() {
  const commonT = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-400"></div>
        <p className="animate-pulse text-gray-500">{commonT("loading")}...</p>
      </div>
    </div>
  );
}
