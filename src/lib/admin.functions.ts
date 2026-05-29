/**
 * @deprecated Server functions replaced by Vercel API routes (/api/admin).
 * Re-exports for backward compatibility during migration.
 */
export {
  listAppUsers,
  createAppUser,
  setUserRole,
  setUserActive,
  resetUserPassword,
  deleteAppUser,
} from "@/services/admin-api.service";
