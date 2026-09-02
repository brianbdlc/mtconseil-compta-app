import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Convention Next.js 16 : « proxy » (anciennement « middleware »).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     * - _next/static, _next/image (assets Next)
     * - favicon.ico, fichiers d'images du dossier public
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
