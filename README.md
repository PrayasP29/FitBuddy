# FitBuddy AI - Fitness Training Platform

A single-page fitness assistant that generates personalized workout routines based on user profiles and preferences.

---

## Architecture Overview

### Tech Stack
- **Frontend**: HTML5 + CSS3 (glass-morphism UI) + Vanilla JavaScript
- **Backend**: Firebase (Authentication + Firestore Database)
- **Design Pattern**: Screen-based navigation with state management

---

## Core Components

### 1. **Authentication Flow**
```
Welcome → Auth (Sign In / Sign Up) → Profile Setup → Workout Generation
```

- **Sign Up**: Email verification required via Firebase
- **Sign In**: Auto-redirects to profile completion or workout dashboard
- **State Persistence**: Firebase `onAuthStateChanged()` enables auto-login on refresh

**Key Functions**:
- `handleAuth()` - Manages sign-in/sign-up with validation
- `validateEmail()` - Regex validation for email format
- `validatePassword()` - Enforces: 8+ chars, 1 uppercase, 1 special char

---

### 2. **User Profile Data Collection**

Collected in sequence:
1. **Name** (`inp-firstname`, `inp-lastname`) - Required fields
2. **Age & Gender** - Used for BMR calculation
3. **Height** (cm or ft/in) - Convertible metric system
4. **Weight** (kg) - For BMI & metabolism calculation
5. **BMI Analysis** - Auto-calculated from height/weight
6. **Metabolism** (BMR + TDEE) - Based on activity level
7. **Fitness Goals** - Multi-select chips (weight loss, hypertrophy, endurance, etc.)
8. **Training Focus** - Muscle groups or exercise categories to prioritize
9. **Time Availability** - Session duration (15/30/45/60 minutes)
10. **Health Constraints** - Medical limitations/injuries

**Key Calculations**:
```javascript
// BMI = weight(kg) / (height(m)^2)
bmi = weight / ((height/100) * (height/100));

// BMR (Mifflin-St Jeor) - used for caloric needs
Male:   BMR = (10×W) + (6.25×H) - (5×A) + 5
Female: BMR = (10×W) + (6.25×H) - (5×A) - 161

// TDEE = BMR × Activity Factor
TDEE = BMR × (1.2 to 2.0 depending on activity level)
```

---

### 3. **Exercise Library & Generation**

**Library Structure** (`exerciseLibrary`):
```javascript
{
  CHEST: [Push-ups, Bench press, ...],
  BACK: [Pull-ups, Rows, ...],
  BICEPS: [...],
  TRICEPS: [...],
  SHOULDERS: [...],
  LEGS: [Squats, Lunges, ...],
  GLUTES: [Hip thrusts, ...],
  CALVES: [...],
  CORE: [Planks, Crunches, ...],
  CARDIO: [Burpees, Sprinting, ...],
  FUNCTIONAL: [Stretching, Mobility, ...]
}
```

**Generation Logic**:

1. **Build Prioritized Pool**
   - If `trainingFocus` selected → include only those muscle groups
   - Else if `goals` selected → map goals to exercise categories (e.g., "Hypertrophy" → CHEST, BACK, LEGS)
   - Fallback: use entire combined pool

2. **Randomize & Select**
   - Shuffle pool, pick N exercises (5-7 depending on available time)
   - Ensure at least 1 cardio exercise at end
   - Remove duplicates, maintain variety

3. **Assign Sets**
   ```
   15-30 min → 2 sets per exercise
   30+ min  → 3 sets per exercise
   ```

**Key Functions**:
- `buildPoolFromGoals()` - Maps fitness goals to exercise categories
- `generateWorkoutByTime()` - Time-aware exercise selection
- `shuffleArray()` - Fisher-Yates shuffle algorithm
- `randomizeIfReady()` - Triggers whenever profile changes

---

**Display Format**:
```
PROTOCOL FOR [USER NAME]
├─ HIGH Intensity | 45 M Duration | 350 Kcal
├─ SEQUENCE (Numbered list with sets/reps)
│  1. Dynamic Warmup - 1 SET - 5 MIN
│  2. Push-ups - 3 SETS
│  3. [Exercise 2-7...]
├─ WORKOUT TIMER (2 min sets + 45 sec rest)
├─ HISTORY (Calendar showing workout days)
└─ Debug Panel (API interaction logs)
```

**Key Functions**:
- `generatePlan()` - Attempts server, falls back to local
- `renderResult()` - Populates exercise list UI
- `parseRoutineToExercises()` - Parses raw LLM text into structured data

---

### 4. **Workout Timer**

**Structure**: Alternates between Workout (2 min) and Rest (45 sec) phases

**State Machine**:
```
IDLE → Workout Set 1 (2:00) → Rest (0:45) → Workout Set 2 → ... → Complete
```

**Controls**:
- Start/Pause/Resume: Manage timer flow
- End Set: Skip to rest/next workout
- Finish Workout: End session, calculate calories burned

**Calorie Calculation**:
```javascript
caloriesPerMinute = (BMR / 1440) × 1.8  // 1.8 = high intensity factor
caloriesBurned = caloriesPerMinute × totalMinutes
```

**Key Functions**:
- `startTimer()` / `pauseTimer()` / `resumeTimer()` - Interval control
- `completePhase()` - Auto-transition between workout/rest
- `endWorkout()` - Calculate and display total calories

---

### 5. **Calendar & Workout History**

**Features**:
- Month/Year selectors
- Interactive date cells (click to mark workout day)
- Highlights completed workouts
- Persists to Firestore (`userData.workoutDays`)

**Key Functions**:
- `populateMonthYearSelectors()` - Build dropdown menus
- `renderCalendar()` - Generate calendar grid for month
- `toggleWorkoutDay()` - Mark/unmark date as completed

---

### 6. **Data Persistence**

**Firestore Document Structure** (`users/{uid}`):
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "age": 25,
  "gender": "Male",
  "height": 178,
  "weight": 70,
  "bmi": 22.1,
  "bmr": 1650,
  "tdee": 2475,
  "activityLevel": "Moderately Active",
  "goals": ["Hypertrophy", "Strength Training"],
  "trainingFocus": ["Chest", "Back", "Legs"],
  "time": "45 Min",
  "health": "Lower back pain - avoid deadlifts",
  "workoutDays": ["2025-12-30", "2025-12-29"],
  "lastPlan": ["Push-ups", "Squats", ...],
  "createdAt": {timestamp}
}
```

**Key Functions**:
- `db.collection("users").doc(uid).set/update()` - Save profile
- `auth.onAuthStateChanged()` - Auto-load on refresh

---

## UI Navigation Stack

**Screen Flow**:
```
screen-welcome → screen-auth → screen-name → screen-age → screen-height 
→ screen-weight → screen-bmi → screen-bmr → screen-goals → screen-health 
→ screen-time → screen-loading → screen-result
```

**Navigation Logic**:
- `navigate(screenId)` - Switches active screen, manages history
- `goBack(fallbackScreen)` - Pops navigation stack
- `navigationStack = []` - Array tracking visited screens for back button

---

## Design System

**Color Scheme**:
```css
--primary: #E50914   /* Netflix red */
--dark: #0a0a0a      /* Premium black */
--glass-panel: rgba(20, 20, 20, 0.85)
--text-main: #ffffff
--text-muted: #aaaaaa
```

**Key CSS Techniques**:
- Glass-morphism (frosted glass effect)
- Backdrop blur with dark overlay
- Smooth fade-in animations
- Minimalist sharp corners (2px radius)
- Box-shadow for depth

---

## Error Handling

**Validation Points**:
1. Email format (regex)
2. Password strength (8+ chars, uppercase, special char)
3. Required fields (first name, last name, age, gender, height, weight)
4. Time selection (must choose one)
5. Field highlighting with error messages

**Network Failures**:
- Server timeout → shows local plan (no crash)
- Auth errors → displays Firebase error messages
- Firestore errors → logged to console

---

## Key Variables & State

```javascript
userData = {
  name, age, gender, height, weight, bmi, bmr, tdee,
  goals, trainingFocus, time, health, email, uid,
  workoutDays, activityLevel
}

timerState = {
  timerSeconds, timerRunning, timerPhase (workout/rest),
  currentSet, timerInterval
}

authState = {
  isLoginMode, isSigningUp, isManualAuthFlow, isExistingLogin
}

exerciseState = {
  lastGeneratedExercises, combinedExercisePool
}
```

---

## Debug Features

**Debug Panel**:
- Toggle visibility via "Show Debug" button
- Logs all API interactions (requests/responses/errors)
- Displays timestamps and full JSON payloads
- Helps diagnose server connectivity issues

**Key Functions**:
- `updateDebugPanel(obj)` - Record debug event
- `toggleDebug()` - Show/hide panel

---

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Edge, Safari)
- Requires ES6+ support
- Firebase compat SDK (IE11 compatible, but not tested)
- Local storage for demo account persistence

---

## Deployment Notes

1. **Firebase Setup**:
   - Create Firebase project
   - Enable Email/Password auth
   - Create Firestore database
   - Replace config with your credentials

2. **Static Hosting**:
   - Deploy HTML as-is to Firebase Hosting or any CDN
   - No build step required

---

## Summary

FitBuddy AI is a **responsive, client-first fitness platform** that:
- ✅ Authenticates users with Firebase
- ✅ Collects detailed fitness profiles
- ✅ Generates personalized workout plans (locally or via AI)
- ✅ Provides interactive timer for sets/rest
- ✅ Tracks workout history
- ✅ Persists all data to Firestore
- ✅ Gracefully degrades if backend is unavailable

All logic is self-contained in a single HTML file with no build dependencies.


### Signed

Prayas Priyadarshi

Mallikarjun Shankar
