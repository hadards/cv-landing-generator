# CLEAN DATABASE SETUP - ONE UNIFIED SOLUTION

## SUMMARY
- ✅ **ONE schema file**: `database/COMPLETE_SCHEMA.sql`
- ✅ **ONE services file**: `database/services.js` 
- ✅ **NO duplicates**: Uses ONLY `user_sites` table (not `generated_sites`)
- ✅ **Maps replaced**: `uploadedFiles` → `file_uploads`, `generatedLandingPages` → `user_sites`

## HOW TO RECREATE DATABASE (CLEAN SLATE)

### Step 1: Drop All Tables in Supabase
```sql
DROP TABLE IF EXISTS processing_logs CASCADE;
DROP TABLE IF EXISTS file_uploads CASCADE;
DROP TABLE IF EXISTS user_sites CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS generated_sites CASCADE;
```

### Step 2: Run Complete Schema
- Copy ALL contents of `database/COMPLETE_SCHEMA.sql`
- Paste into Supabase SQL Editor
- Run it

### Step 3: Verify
```bash
npm run db:test
```
Should show: `users`, `file_uploads`, `user_sites`, `processing_logs`, `user_preferences`

## DATABASE STRUCTURE

### Core Tables:
1. **`users`** - Authentication and profiles
2. **`file_uploads`** - Replaces `uploadedFiles` Map
3. **`user_sites`** - Replaces `generatedLandingPages` Map (UNIFIED table with all old + new columns)
4. **`processing_logs`** - Monitoring
5. **`user_preferences`** - User settings (existing functionality)

### What's UNIFIED:
- `user_sites` has BOTH old columns (`repo_name`, `github_url`, `pages_url`) AND new columns (`html_content`, `css_content`, `folder_path`)
- Services use ONLY `user_sites` table - NO `generated_sites`
- NO duplicate logic anywhere

## CONTROLLER STATUS
✅ `controllers/cvController.js` updated to use database instead of Maps

## READY TO USE
Your app now has:
- Zero in-memory Maps
- All data persisted in database
- Unified table structure
- No duplicate logic