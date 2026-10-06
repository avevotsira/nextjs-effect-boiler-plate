import { Link } from "@/i18n/routing";

import { ArrowRight, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const commonT = useTranslations("common");
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-sm bg-blue-50 p-2">
          <ShieldAlert className="" />
        </span>
        <h3 className="text-xl font-semibold">{commonT("not_found_page")}</h3>
        <p className="text-md font-medium text-muted-foreground">
          {commonT("not_found_page_description")}
        </p>
        <p className="text-md font-medium text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 ps-2 underline">
            {commonT("back_home")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </p>
      </div>
    </div>
  );
}
