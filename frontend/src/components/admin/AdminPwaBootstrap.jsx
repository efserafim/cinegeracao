import { useEffect } from "react";
import { enableAdminPwa } from "../../lib/pwa";

/** Liga manifest + service worker apenas nas rotas /admin. */
export default function AdminPwaBootstrap() {
  useEffect(() => {
    enableAdminPwa();
  }, []);
  return null;
}
