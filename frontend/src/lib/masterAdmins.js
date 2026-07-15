export const MASTER_ADMIN_EMAILS = [
  "laviniadossantos22@gmail.com",
  "efserafimflu@gmail.com",
];

export function isMasterAdminEmail(email) {
  return MASTER_ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase());
}
