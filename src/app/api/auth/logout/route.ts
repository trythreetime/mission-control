import { apiSuccess } from "@/lib/api-response";
import { clearAuthCookies } from "@/lib/auth/cookies";

export async function POST() {
  const response = apiSuccess({ loggedOut: true });
  clearAuthCookies(response);
  return response;
}
