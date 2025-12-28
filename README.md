# FitBuddy AI - Elite Training Protocol

**Discipline through personalization, not motivation.**

A premium, single-page fitness training application built with vanilla HTML, CSS, and JavaScript. FitBuddy AI generates personalized workout protocols based on user biometrics, goals, and time constraints.

---

## Features

### Authentication & User Management
- **Dual-Mode Authentication**: Sign in or create new accounts
- **Password Validation**: Minimum 8 characters, uppercase letter, and special character required
- **Email Validation**: RFC-compliant email format validation
- **Local Storage Persistence**: Account data saved in browser (`localStorage`)

### User Profiling
- **Biometric Data Collection**:
  - Name, age, height (ft/in or cm), weight (kg)
  - Automatic BMI calculation with health category assessment
  
- **Goal Selection**: Multi-select fitness objectives
  - Weight Loss
  - Hypertrophy (Muscle Gain)
  - Endurance
  - Athleticism
  
- **Time Allocation**: Choose daily availability
  - 15, 30, 45, or 60 minutes
  
- **Health Constraints**: Text field for injury/medical conditions

### Workout Protocol Generation
- **AI-Powered Customization**: Generates 6-8 exercise sequences based on:
  - BMI category and fitness level
  - Selected fitness goals
  - Available training time
  
- **Exercise Details**: Each exercise includes:
  - Exercise name
  - Sets and reps/duration
  - Difficulty level
  - Caloric burn estimate

### Workout Tracking
- **Built-in Timer**:
  - 45-minute workout timer (adjustable)
  - Automatic set tracking
  - Rest period management (45 sec between sets)
  - Play/Pause/Resume controls
  
- **Activity Calendar**:
  - Visual calendar grid showing workout history
  - Click to mark/unmark workout dates
  - Monthly view with day headers
  - Persistent tracking across sessions

---

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: Browser `localStorage` API
- **Fonts**: Google Fonts (Montserrat, Oswald)
- **Background**: Unsplash fitness imagery with blur effect
- **Architecture**: Single-page application (SPA) with screen-based navigation

---

## User Flow

```
Welcome Screen
    ↓
Authentication (Sign In / Sign Up)
    ↓
Profile Setup (5 steps):
  1. Name Entry
  2. Age Entry
  3. Height (ft/in or cm toggle)
  4. Weight + BMI Analysis
  5. Goals & Time Allocation
  6. Health Constraints
    ↓
Protocol Generation (Loading Screen)
    ↓
Workout Dashboard:
  - Personalized Protocol Display
  - Workout Statistics (Intensity, Duration, Calories)
  - Built-in Timer
  - Activity Tracker Calendar
  - Exercise Sequence List
  - Session Control
    ↓
Logout / Reset
```

---

## Design System

### Color Palette
| Color | Value | Usage |
|-------|-------|-------|
| **Primary Red** | `#E50914` | CTAs, accents, glow effects |
| **Dark Background** | `#0a0a0a` | App container, typography |
| **Glass Panel** | `rgba(20,20,20,0.85)` | Semi-transparent surfaces |
| **Text Primary** | `#ffffff` | Main text content |
| **Text Muted** | `#aaaaaa` | Secondary labels |

### Typography
- **Headers**: Oswald (Bold, Italic, Uppercase)
- **Body**: Montserrat (Regular, Medium)
- **Letter Spacing**: 1-2px for premium feel
- **Min Radius**: 2px for sharp, modern aesthetic

### UI Components
- **Buttons**: Full-width, uppercase, glowing on hover
- **Inputs**: Dark transparent backgrounds with red focus state
- **Chips**: Multi-select toggle indicators with glow
- **Cards**: Glass-morphism effect with subtle borders
- **Timer Display**: Large, prominent typography with red glow

---

## Data Structure

### User Object
```javascript
{
  name: String,           // Uppercase user name
  age: Number,            // In years
  height: Number,         // In centimeters
  weight: Number,         // In kilograms
  bmi: Number,            // Calculated (1 decimal)
  goals: Array<String>,   // Selected fitness objectives
  time: String,           // Daily time allocation (e.g., "45 Min")
  health: String,         // Medical constraints/injuries
  email: String,          // Account email
  workoutDays: Array      // Dates of completed workouts (YYYY-MM-DD)
}
```

### Account Storage
```javascript
// localStorage key: 'fitbuddyAccounts'
{
  "user@email.com": {
    password: String,
    name: String,
    workoutDays: Array
  }
}
```

---

## Key Functions

### Navigation & Screens
- `navigate(screenId)` - Switch between app screens
- `goBack(screenId, isWelcome)` - Navigate with back button
- `goToAuth()` - Enter authentication flow

### Authentication
- `handleAuth()` - Sign in or sign up with validation
- `validateEmail(email)` - RFC email format check
- `validatePassword(password)` - 8+ chars, uppercase, special char
- `toggleAuthMode()` - Switch between sign in/sign up

### Biometric Profiling
- `validateNext(inputId, nextId)` - Save field and advance
- `setHeightMode(mode)` - Toggle between ft/in and cm
- `saveHeight()` - Convert height to centimeters
- `calcBMI()` - Calculate BMI and categorize health status
- `toggleChip(el)` - Multi-select goal toggling
- `selectSingle(el)` - Single-select time allocation

### Workout Protocol
- `generatePlan()` - Trigger 2-second loading animation and generate
- `renderResult()` - Build personalized exercise list based on goals
- `startWorkout()` - Initialize timer and first set

### Timer System
- `startTimer()` - Begin interval countdown
- `pauseTimer()` - Pause without resetting
- `resumeTimer()` - Continue from paused state
- `endSet()` - Toggle between workout/rest phases
- `completePhase()` - Auto-advance to next phase
- `updateTimerDisplay()` - Format MM:SS display

### Activity Tracking
- `renderCalendar()` - Generate monthly calendar grid
- `toggleWorkoutDay(dateStr, element)` - Mark workout completion
- `logout()` - Clear session and return to welcome

---

## Responsive Design

- **Mobile-First**: Optimized for 420px max-width (portrait mobile)
- **Max Height**: 800px app container for viewing on desktop
- **Background**: Fixed, blurred gym image
- **Hero Mode**: Transparent container for welcome screen
- **Flexible Typography**: Scales appropriately across breakpoints

---

## Data Persistence

All user data persists via browser `localStorage`:

1. **Account Management**
   - Email/password stored in `fitbuddyAccounts` object
   - New accounts created on first sign-up
   
2. **Workout History**
   - Workout dates saved per account
   - Persists across login/logout sessions
   
3. **Session Data**
   - Loaded from storage on sign-in
   - Cleared on logout

**Note**: This is a client-side demo. Production apps should use:
- Secure backend authentication (OAuth, JWT)
- Encrypted password storage (bcrypt)
- Cloud database (Firebase, MongoDB)
- HTTPS encryption

---

## Workout Logic

### Exercise Selection
- **Based on BMI**:
  - **Underweight** (<18.5): Hypertrophy-focused with compound lifts
  - **Optimal** (18.5-25): Balanced strength and performance
  - **Overweight** (>25): High-intensity cardio emphasis

- **Based on Goals**:
  - Hypertrophy → Barbell squats, incline press, deadlifts (3-4 sets, 6-10 reps)
  - Endurance → Box jumps, burpees, sprints (4-5 sets, 30-45 sec)
  - Default: Core work, dynamic warmup, and cool-down

### Timer Behavior
- Starts at 45 minutes (editable via `timerSeconds` variable)
- Automatically alternates between work/rest phases
- Rest period: 45 seconds between sets
- Manual controls: Start, Pause, Resume, End

---

## Getting Started

### Installation
1. Save the HTML file locally or deploy to web server
2. Open in modern browser (Chrome, Firefox, Safari, Edge)
3. No build process or dependencies required

### First Use
1. Click **"Get Started"**
2. Choose **"Sign Up"** (or sign in with existing account)
3. Enter email and password meeting security requirements
4. Complete 6-step profile setup
5. View personalized workout protocol
6. Start timer and begin training!

### Testing
- **Demo Account**: Create any valid email/password combo
- **Sample Data**: Pre-filled exercises based on BMI/goals
- **Calendar**: Click dates to mark completed workouts
- **Timer**: Use Start/Pause/Resume to test countdown

---

## Password Requirements

- **Minimum**: 8 characters
- **Uppercase**: At least one A-Z letter
- **Special Character**: At least one of `!@#$%^&*()_+-=[]{};\\':"\\|,.<>/?`
- **Example Valid**: `MyFitness@2024`, `Gym$Password123`

---

## Future Enhancements

- [ ] Backend API integration for secure authentication
- [ ] Real AI model for dynamic workout generation
- [ ] Exercise video tutorials and form guides
- [ ] Nutrition tracking and meal planning
- [ ] Advanced analytics (progress graphs, body scan)
- [ ] Dark mode / theme customization

---

## Authors

**FitBuddy AI Development Team**  

*Mallikarjun Shankar*

*Prayas Priyadarshi*
