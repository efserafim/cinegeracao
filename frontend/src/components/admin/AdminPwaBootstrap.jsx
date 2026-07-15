import { useEffect } from "react";
import { enableAdminPwa } from "../../lib/pwa";

export default function AdminPwaBootstrap() {
  useEffect(() => {
    enableAdminPwa();
  }, []);
  return null;
}
