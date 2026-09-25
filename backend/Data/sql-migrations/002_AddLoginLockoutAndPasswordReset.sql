-- ============================================================
-- Week 2 addendum: account lockout + email password reset
-- Adds columns to dbo.[User]. Naming follows SQL Server Standards v1.5:
--   - Bit-like flags get affirmative names (not used here, no new bit columns)
--   - Date/time columns include "Date" in the name
--   - No abbreviations, PascalCase, no underscores
--
-- NOTE: If you're using EF Core migrations instead of running this by hand,
-- this script is the equivalent of running:
--   dotnet ef migrations add AddLoginLockoutAndPasswordReset
--   dotnet ef database update
-- Only run ONE of the two approaches, not both, or the columns will conflict.
-- ============================================================

ALTER TABLE dbo.[User] ADD
    FailedLoginAttempts         INT NOT NULL CONSTRAINT DfUser_FailedLoginAttempts DEFAULT (0),
    LockoutEndDate               DATETIME NULL,
    PasswordResetTokenHash       VARCHAR(64) NULL,   -- SHA-256 hex digest, never the raw token
    PasswordResetTokenExpiryDate DATETIME NULL;
GO
