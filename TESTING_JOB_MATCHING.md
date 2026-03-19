# Job Matching System - Testing Guide

## Overview
The Job Matching System computes personalized job recommendations based on 4 factors:
- **Skills** (40% weight) - Overlap between user skills and job requirements
- **Role** (20% weight) - Match between target role and job title
- **Location** (20% weight) - Match between preferred location and job location
- **Experience** (20% weight) - User experience vs job requirements

---

## Files Created/Modified

### New Files
1. **SQL Schema**: `supabase_job_matches_schema.sql`
   - Creates `job_matches` table with RLS policies
   - Adds indexes for fast querying

2. **Matching Algorithm**: `lib/jobMatchingEngine.ts`
   - Core matching logic with 4 scoring functions
   - Utility functions for skill extraction and normalization

3. **API Endpoint**: `app/api/jobs/match/route.ts`
   - POST: Compute and store new matches
   - GET: Retrieve existing matches

4. **Dashboard Component**: `components/jobs/JobMatchesDisplay.tsx`
   - Beautiful display of top 10 matches
   - Score breakdown visualization
   - Skill matching indicators

### Modified Files
1. **Types**: `types/jobs.ts`
   - Added `JobMatch` and `JobMatchResult` interfaces

2. **Services**: `lib/jobsService.ts`
   - Added job matching functions:
     - `getUserProfileForMatching()`
     - `getUserJobMatches()`
     - `upsertJobMatch()`
     - `deleteJobMatches()`

3. **Jobs Module**: `components/jobs/JobsModule.tsx`
   - Added "✨ Smart Matches" tab
   - Integrated `JobMatchesDisplay` component

---

## Testing Steps

### Step 1: Database Setup
Run this SQL in Supabase to create the job_matches table:

```bash
# Option A: Via Supabase UI
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Paste contents of: supabase_job_matches_schema.sql
5. Run query
```

Or via migration:
```bash
# Option B: Using Supabase CLI
supabase migration new create_job_matches
# Then add the SQL from supabase_job_matches_schema.sql
supabase db push
```

### Step 2: Create Test Data

#### Create a Test User with Profile
```sql
-- User should already exist from auth
-- Update their profile with skills and preferences
UPDATE profiles 
SET 
  skills = array['python', 'django', 'sql', 'react'],
  target_role = 'Full Stack Developer',
  preferred_location = 'San Francisco, USA',
  years_experience = 3
WHERE id = 'YOUR_USER_ID';
```

#### Create Test Jobs
```sql
INSERT INTO jobs (title, company, location, description, required_skills, experience_min, experience_max, status, created_by)
VALUES 
  -- Perfect skill match
  ('Python Developer', 'Tech Corp', 'San Francisco, USA', 'Build scalable Python applications', array['python', 'django', 'sql'], 2, 5, 'approved', 'admin_id'),
  
  -- Good match
  ('Full Stack Developer', 'StartupXYZ', 'San Francisco, USA', 'React + Node.js role', array['react', 'node.js', 'typescript', 'mongodb'], 3, 7, 'approved', 'admin_id'),
  
  -- Partial match
  ('Senior React Developer', 'WebAgency', 'New York, USA', 'Expert React skills required', array['react', 'typescript', 'next.js', 'jest'], 5, 10, 'approved', 'admin_id'),
  
  -- Low match
  ('DevOps Engineer', 'CloudCorp', 'Berlin, Germany', 'Kubernetes and Docker expertise', array['docker', 'kubernetes', 'ci/cd', 'go'], 4, 8, 'approved', 'admin_id');
```

### Step 3: Test the API

#### A. Test Match Computation (POST)
```bash
curl -X POST http://localhost:3000/api/jobs/match \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

Expected Response:
```json
{
  "success": true,
  "message": "Computed 4 matches, showing top 4",
  "total_matches": 4,
  "matches": [
    {
      "job_id": "uuid-1",
      "title": "Python Developer",
      "company": "Tech Corp",
      "location": "San Francisco, USA",
      "score": 95,
      "skill_score": 100,
      "role_score": 80,
      "location_score": 100,
      "experience_score": 100,
      "matched_skills": ["python", "django", "sql"],
      "missing_skills": []
    },
    ...
  ]
}
```

#### B. Test Get Matches (GET)
```bash
curl -X GET http://localhost:3000/api/jobs/match?limit=10 \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Step 4: Test via UI

1. **Navigate to Dashboard**
   - Go to `/dashboard/jobs`

2. **Click "✨ Smart Matches" Tab**
   - Tab shows "Showing top X matches"

3. **Click "Find Matches" Button**
   - Computes matches for current user
   - Shows loading state
   - Displays results with:
     - Overall match percentage
     - Score breakdown (Skills/Role/Location/Experience)
     - Green checkmarks for matched skills
     - Yellow indicators for missing skills

4. **Verify Match Scores**

Test Case 1: Perfect Skill Match
- User: ["Python", "Django", "SQL"]
- Job: ["Python", "Django", "SQL"]
- Expected Score: **85-95** (depends on role/location/experience)

Test Case 2: Partial Skill Match
- User: ["React", "SQL"]
- Job: ["React", "TypeScript", "Node.js", "MongoDB"]
- Expected Score: **40-60** (1/4 skills matched)

Test Case 3: No Skill Overlap
- User: ["Python", "Django"]
- Job: ["Go", "Kubernetes", "Docker"]
- Expected Score: **0-30** (no matching skills)

---

## Database Verification

### Query to Check Stored Matches
```sql
SELECT 
  jm.user_id,
  jm.job_id,
  j.title,
  j.company,
  jm.total_score,
  jm.skill_score,
  jm.matched_skills,
  jm.missing_skills,
  jm.created_at
FROM job_matches jm
JOIN jobs j ON jm.job_id = j.id
ORDER BY jm.total_score DESC;
```

### Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'job_matches';
```

---

## Scoring Algorithm Breakdown

### Skill Score (40% weight)
```
matched_count = 2
required_count = 3
skill_score = 2/3 = 0.66 (66%)
```

### Role Score (20% weight)
```
User: "Full Stack Developer"
Job: "Python Developer"

"developer" keyword matches → role_score = 0.6 (60%)
```

### Location Score (20% weight)
```
User: "San Francisco, USA"
Job: "San Francisco, USA"

Exact match → location_score = 1.0 (100%)
```

### Experience Score (20% weight)
```
User Experience: 3 years
Job Requirement: 2-5 years

Within range → experience_score = 1.0 (100%)

Total Score = (0.66 × 0.4) + (0.6 × 0.2) + (1.0 × 0.2) + (1.0 × 0.2)
            = 0.264 + 0.12 + 0.2 + 0.2
            = 0.784 (78%)
```

---

## Performance Considerations

### Time Complexity
- Computing matches for N jobs: O(N)
- Each match computation: O(S) where S = average skills count
- Total: O(N × S) ≈ O(N) for typical data

### Storage
- job_matches table: ~1-2KB per record
- For 100 users × 100 jobs = 10,000 records ≈ 10-20MB

### Indexes
- `idx_job_matches_user_id` - Fast match retrieval per user
- `idx_job_matches_total_score` - Fast sorting
- `idx_job_matches_user_score` - Combined lookup (user + score)

---

## Expected Issues & Solutions

### Issue 1: Matches not appearing
**Solution**: Ensure profile has:
- skills array populated
- target_role set
- preferred_location set

### Issue 2: All scores are low
**Solution**: Check if:
- Job required_skills are populated
- User skills format matches (lowercase, normalized)

### Issue 3: Computation is slow
**Solution**: 
- Check job_matches table indexes
- Consider implementing job_matches caching

---

## Next Steps After Testing

1. **✅ Verify API endpoints work**
2. **✅ Check database storage**
3. **✅ Validate UI display**
4. Add Realtime subscriptions
5. Add match notifications
6. Implement periodic recomputation
7. Add match history tracking

---

## Local Testing Checklist

- [ ] Database schema created
- [ ] Test jobs inserted
- [ ] POST /api/jobs/match returns 4-factor scores
- [ ] GET /api/jobs/match retrieves stored matches
- [ ] Dashboard displays "✨ Smart Matches" tab
- [ ] "Find Matches" button computes new scores
- [ ] Scores are displayed with breakdown
- [ ] Matched skills show green checkmarks
- [ ] Missing skills show yellow indicators
- [ ] Top 10 matches sorted by score
- [ ] Score colors change based on percentage (green 80+, blue 60-79, yellow 40-59, red <40)
