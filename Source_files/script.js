  // --- APP LOGIC ---
    
    // Initial Setup
    const app = document.getElementById('app');
    let isMetric = false;
    let isLoginMode = true;
    let isExistingLogin = false;
    let timerInterval = null;
    let timerSeconds = 120; // 2 minutes in seconds for workout
    let timerRunning = false;
    let timerPhase = 'workout'; // 'workout' or 'rest'
    let currentSet = 1;

    const userData = {
        name: 'User',
        age: 0,
        height: 0,
        weight: 0,
        bmi: 0,
        goals: [],
        time: '45 Min',
        health: '',
        email: '',
        workoutDays: [] // Track workout dates
    };

    // Registered accounts storage (in real app, use backend)
    const accounts = JSON.parse(localStorage.getItem('fitbuddyAccounts')) || {};

    // --- EMAIL VALIDATION ---
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // --- PASSWORD VALIDATION ---
    function validatePassword(password) {
        // Must be 8+ chars, contain uppercase and special character
        if (password.length < 8) return false;
        if (!/[A-Z]/.test(password)) return false;
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
        return true;
    }

    // Navigation
    function navigate(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        // Toggle Hero Mode CSS
        if(screenId === 'screen-welcome') {
            app.classList.add('hero-mode');
        } else {
            app.classList.remove('hero-mode');
        }
    }

    function goBack(screenId, isWelcome = false) {
        navigate(screenId);
    }

    // Auth Flow
    function goToAuth() { navigate('screen-auth'); }
    
    function toggleAuthMode() {
        isLoginMode = !isLoginMode;
        document.getElementById('auth-title').innerText = isLoginMode ? "Welcome Back" : "Create Account";
        document.getElementById('auth-sub').innerText = isLoginMode ? "Sign in to your account" : "Create new account to get started";
        document.getElementById('auth-toggle-text').innerText = isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In";
        document.getElementById('auth-error').style.display = 'none';
        document.getElementById('confirm-error').style.display = 'none';
        document.getElementById('auth-confirm').style.display = isLoginMode ? 'none' : 'block';
    }

    function handleAuth() {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        const confirmPass = document.getElementById('auth-confirm').value;
        const errorDiv = document.getElementById('auth-error');
        const confirmErrorDiv = document.getElementById('confirm-error');

        if(!email || !pass) {
            errorDiv.innerText = "EMAIL AND PASSWORD REQUIRED";
            errorDiv.style.display = 'block';
            confirmErrorDiv.style.display = 'none';
            return;
        }

        // Email format validation
        if(!validateEmail(email)) {
            errorDiv.innerText = "INVALID EMAIL FORMAT (use: local@domain.com)";
            errorDiv.style.display = 'block';
            confirmErrorDiv.style.display = 'none';
            return;
        }

        if(isLoginMode) {
            // Sign In - Existing User
            if(!accounts[email] || accounts[email].password !== pass) {
                errorDiv.innerText = "INVALID EMAIL OR PASSWORD";
                errorDiv.style.display = 'block';
                confirmErrorDiv.style.display = 'none';
                return;
            }
            userData.email = email;
            userData.name = accounts[email].name;
            userData.workoutDays = accounts[email].workoutDays || [];
            userData.height = accounts[email].height || 0;
            userData.weight = accounts[email].weight || 0;
            userData.bmi = accounts[email].bmi || 0;
            userData.goals = accounts[email].goals || [];
            userData.health = accounts[email].health || '';
            // Mark that this is an existing login so selecting today's time auto-generates plan
            isExistingLogin = true;
            // Load previous time preference if available
            userData.time = accounts[email].time || userData.time;
            errorDiv.style.display = 'none';
            confirmErrorDiv.style.display = 'none';
            // Existing users go to time selection for daily commitment
            navigate('screen-time');
        } else {
            // Sign Up - New User
            // Check if passwords match
            if(pass !== confirmPass) {
                confirmErrorDiv.innerText = "PLEASE RECHECK THE PASSWORD";
                confirmErrorDiv.style.display = 'block';
                errorDiv.style.display = 'none';
                return;
            }

            if(!validatePassword(pass)) {
                errorDiv.innerText = "PASSWORD: MIN 8 CHARS, 1 UPPERCASE, 1 SPECIAL CHAR (!@#$%^&*...)";
                errorDiv.style.display = 'block';
                confirmErrorDiv.style.display = 'none';
                return;
            }

            if(accounts[email]) {
                errorDiv.innerText = "ACCOUNT ALREADY EXISTS";
                errorDiv.style.display = 'block';
                confirmErrorDiv.style.display = 'none';
                return;
            }

            // Create new account and proceed to setup
            accounts[email] = {
                password: pass,
                name: 'User',
                workoutDays: [],
                height: 0,
                weight: 0,
                bmi: 0,
                goals: [],
                health: ''
            };
            localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
            userData.email = email;
            errorDiv.style.display = 'none';
            confirmErrorDiv.style.display = 'none';
            // New users go through full setup
            navigate('screen-name');
        }
    }

    // Data Flow
    function validateName() {
        const firstName = document.getElementById('inp-firstname').value.trim();
        const middleName = document.getElementById('inp-middlename').value.trim();
        const lastName = document.getElementById('inp-lastname').value.trim();
        const firstNameError = document.getElementById('firstname-error');
        const lastNameError = document.getElementById('lastname-error');

        let hasError = false;

        // Check first name
        if(!firstName) {
            firstNameError.innerText = "PLEASE ENTER THE REQUIRED FIELD";
            firstNameError.style.display = 'block';
            hasError = true;
        } else {
            firstNameError.style.display = 'none';
        }

        // Check last name
        if(!lastName) {
            lastNameError.innerText = "PLEASE ENTER THE REQUIRED FIELD";
            lastNameError.style.display = 'block';
            hasError = true;
        } else {
            lastNameError.style.display = 'none';
        }

        // If there are errors, don't proceed
        if(hasError) return;

        // Combine names
        let fullName = firstName;
        if(middleName) fullName += " " + middleName;
        fullName += " " + lastName;

        userData.name = fullName.toUpperCase();
        accounts[userData.email].name = userData.name;
        localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
        document.getElementById('disp-name').innerText = userData.name;
        navigate('screen-age');
    }

    function validateNext(inputId, nextId) {
        const val = document.getElementById(inputId).value;
        if(!val) return alert("INPUT REQUIRED");
        navigate(nextId);
    }

    function setHeightMode(mode) {
        isMetric = (mode === 'cm');
        document.getElementById('div-ft').style.display = isMetric ? 'none' : 'flex';
        document.getElementById('div-cm').style.display = isMetric ? 'block' : 'none';
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
    }

    function saveHeight() {
        if(isMetric) {
            const cm = document.getElementById('inp-cm').value;
            if(!cm) return alert("ENTER HEIGHT");
            userData.height = parseFloat(cm);
        } else {
            const ft = document.getElementById('inp-ft').value;
            const inch = document.getElementById('inp-in').value;
            if(!ft) return alert("ENTER HEIGHT");
            userData.height = (parseFloat(ft) * 30.48) + (parseFloat(inch || 0) * 2.54);
        }
        // Save to account
        accounts[userData.email].height = userData.height;
        localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
        navigate('screen-weight');
    }

    function calcBMI() {
        const w = document.getElementById('inp-weight').value;
        if(!w) return alert("ENTER WEIGHT");
        userData.weight = parseFloat(w);
        
        const h_m = userData.height / 100;
        const bmi = userData.weight / (h_m * h_m);
        userData.bmi = bmi.toFixed(1);
        
        // Save to account
        accounts[userData.email].weight = userData.weight;
        accounts[userData.email].bmi = userData.bmi;
        localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
        
        document.getElementById('bmi-disp').innerText = userData.bmi;
        let cat = "";
        let desc = "";
        
        if(bmi < 18.5) { cat = "UNDERWEIGHT"; desc = "Focus: Caloric Surplus & Hypertrophy"; }
        else if(bmi < 25) { cat = "OPTIMAL"; desc = "Focus: Maintenance & Performance"; }
        else { cat = "OVERWEIGHT"; desc = "Focus: High Intensity Output"; }
        
        document.getElementById('bmi-cat').innerText = cat;
        document.getElementById('bmi-desc').innerText = desc;
        navigate('screen-bmi');
    }

    // Chips
    function toggleChip(el) {
        el.classList.toggle('selected');
        const val = el.innerText;
        if(el.classList.contains('selected')) userData.goals.push(val);
        else userData.goals = userData.goals.filter(g => g !== val);
        // Save to account
        accounts[userData.email].goals = userData.goals;
        localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
    }
    
    function selectSingle(el) {
        el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        userData.time = el.innerText;
        // Save to account
        accounts[userData.email].time = userData.time;
        localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
        // If this selection is happening right after an existing user logged in,
        // automatically generate the plan for today's session
        if(isExistingLogin) {
            isExistingLogin = false;
            generatePlan();
        }
    }

    // Generation
    function generatePlan() {
        navigate('screen-loading');
        setTimeout(() => {
            // Save health information to account
            // ensure latest health textarea is saved if present
            if(document.getElementById('inp-health')) {
                userData.health = document.getElementById('inp-health').value || userData.health || '';
            }
            accounts[userData.email].health = userData.health;
            localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
            renderResult();
            navigate('screen-result');
            populateMonthYearSelectors();
            renderCalendar();
        }, 2000);
    }

    function saveHealthAndContinue() {
        const h = document.getElementById('inp-health').value;
        userData.health = h;
        if(userData.email) {
            accounts[userData.email].health = userData.health;
            localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
        }
        navigate('screen-time');
    }

    function renderResult() {
        document.getElementById('res-name').innerText = userData.name;
        document.getElementById('res-time').innerText = userData.time;
        
        const list = document.getElementById('exercise-list');
        list.innerHTML = "";
        
        let exercises = [
            { n: "Dynamic Warmup", s: "1 SET", r: "5 MIN" },
        ];
        
        if(userData.goals.includes('Hypertrophy') || userData.bmi < 18.5) {
            exercises.push({ n: "Barbell Squats", s: "4 SETS", r: "8 REPS" });
            exercises.push({ n: "Incline Press", s: "4 SETS", r: "10 REPS" });
            exercises.push({ n: "Deadlifts", s: "3 SETS", r: "6 REPS" });
        } else {
            exercises.push({ n: "Box Jumps", s: "4 SETS", r: "45 SEC" });
            exercises.push({ n: "Burpees", s: "3 SETS", r: "15 REPS" });
            exercises.push({ n: "Sprints", s: "5 SETS", r: "30 SEC" });
        }
        
        exercises.push({ n: "Core Plank", s: "3 SETS", r: "FAILURE" });
        
        exercises.forEach((ex, i) => {
            list.innerHTML += `
            <div class="exercise-item">
                <div class="ex-num">${i+1}</div>
                <div class="ex-info" style="flex:1">
                    <h4>${ex.n}</h4>
                    <div class="ex-meta">${ex.s} &middot; ${ex.r}</div>
                </div>
            </div>`;
        });
    }

    // --- TIMER FUNCTIONALITY ---
    function startWorkout() {
        alert('🏋️ Training Session Initiated. 2 MIN workout sets with 45 SEC rest periods. Use the timer to track!');
        timerSeconds = 120; // 2 minutes for first workout
        timerPhase = 'workout';
        currentSet = 1;
        document.getElementById('timer-phase').innerText = 'WORKOUT SET ' + currentSet;
        updateTimerDisplay();
        startTimer();
    }

    function startTimer() {
        if(timerRunning) return;
        timerRunning = true;
        document.getElementById('timer-start').style.display = 'none';
        document.getElementById('timer-pause').style.display = 'inline-block';
        document.getElementById('timer-end').style.display = 'inline-block';
        
        timerInterval = setInterval(() => {
            if(timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                completePhase();
            }
        }, 1000);
    }

    function pauseTimer() {
        timerRunning = false;
        clearInterval(timerInterval);
        document.getElementById('timer-pause').style.display = 'none';
        document.getElementById('timer-resume').style.display = 'inline-block';
    }

    function resumeTimer() {
        startTimer();
        document.getElementById('timer-resume').style.display = 'none';
        document.getElementById('timer-pause').style.display = 'inline-block';
    }

    function endSet() {
        clearInterval(timerInterval);
        timerRunning = false;
        
        if(timerPhase === 'workout') {
            // Switch to rest period (45 seconds)
            timerPhase = 'rest';
            timerSeconds = 45;
            document.getElementById('timer-phase').innerText = '🔄 REST PERIOD';
            updateTimerDisplay();
            
            // Hide End button during rest, show info
            document.getElementById('timer-pause').style.display = 'none';
            document.getElementById('timer-resume').style.display = 'none';
            document.getElementById('timer-end').style.display = 'inline-block';
            document.getElementById('timer-start').style.display = 'inline-block';
        } else {
            // Rest period ended, switch back to workout (2 minutes)
            timerPhase = 'workout';
            timerSeconds = 120; // Reset to 2 minutes
            currentSet++;
            document.getElementById('timer-phase').innerText = 'WORKOUT SET ' + currentSet;
            updateTimerDisplay();
            
            // Reset button states
            document.getElementById('timer-pause').style.display = 'none';
            document.getElementById('timer-resume').style.display = 'none';
            document.getElementById('timer-start').style.display = 'inline-block';
        }
    }

    function completePhase() {
        clearInterval(timerInterval);
        timerRunning = false;
        
        if(timerPhase === 'workout') {
            // Workout complete, move to rest
            timerPhase = 'rest';
            timerSeconds = 45;
            document.getElementById('timer-phase').innerText = '🔄 REST PERIOD';
            updateTimerDisplay();
            alert('⏱️ SET ' + currentSet + ' COMPLETE! 45-second rest starting...');
            startTimer();
        } else {
            // Rest complete, move to next workout set
            timerPhase = 'workout';
            timerSeconds = 120; // Reset to 2 minutes
            currentSet++;
            document.getElementById('timer-phase').innerText = 'WORKOUT SET ' + currentSet;
            updateTimerDisplay();
            alert('💪 Rest Complete! Ready for SET ' + currentSet + '!');
            
            // Reset button states
            document.getElementById('timer-pause').style.display = 'none';
            document.getElementById('timer-resume').style.display = 'none';
            document.getElementById('timer-start').style.display = 'inline-block';
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('timer-display').innerText = display;
    }

    // --- CALENDAR FUNCTIONALITY ---
    function populateMonthYearSelectors(selectedMonth, selectedYear) {
        const monthSelect = document.getElementById('calendar-month-select');
        const yearSelect = document.getElementById('calendar-year-select');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        monthSelect.innerHTML = '';
        months.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = m;
            monthSelect.appendChild(opt);
        });

        // Build year range around current year
        const today = new Date();
        const baseYear = today.getFullYear();
        yearSelect.innerHTML = '';
        for(let y = baseYear - 2; y <= baseYear + 2; y++) {
            const o = document.createElement('option');
            o.value = y;
            o.innerText = y;
            yearSelect.appendChild(o);
        }

        if(typeof selectedMonth === 'number') monthSelect.value = selectedMonth;
        else monthSelect.value = today.getMonth();
        if(typeof selectedYear === 'number') yearSelect.value = selectedYear;
        else yearSelect.value = baseYear;

        monthSelect.onchange = () => renderCalendar(parseInt(monthSelect.value), parseInt(yearSelect.value));
        yearSelect.onchange = () => renderCalendar(parseInt(monthSelect.value), parseInt(yearSelect.value));
    }

    function renderCalendar(monthIndex, year) {
        const today = new Date();
        const currentMonth = (typeof monthIndex === 'number') ? monthIndex : today.getMonth();
        const currentYear = (typeof year === 'number') ? year : today.getFullYear();
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';
        
        // Day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day header';
            header.innerText = day;
            grid.appendChild(header);
        });
        
        // Empty cells before month starts
        for(let i = 0; i < firstDay.getDay(); i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day';
            empty.style.background = 'transparent';
            empty.style.border = 'none';
            grid.appendChild(empty);
        }
        
        // Days of month
        for(let day = 1; day <= lastDay.getDate(); day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            cell.innerText = day;
            
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if(userData.workoutDays.includes(dateStr)) {
                cell.classList.add('active');
            }
            
            cell.onclick = () => toggleWorkoutDay(dateStr, cell);
            grid.appendChild(cell);
        }
    }

    function toggleWorkoutDay(dateStr, element) {
        const index = userData.workoutDays.indexOf(dateStr);
        if(index > -1) {
            userData.workoutDays.splice(index, 1);
            element.classList.remove('active');
        } else {
            userData.workoutDays.push(dateStr);
            element.classList.add('active');
        }
        // Save to account
        accounts[userData.email].workoutDays = userData.workoutDays;
        localStorage.setItem('fitbuddyAccounts', JSON.stringify(accounts));
    }

    // --- LOGOUT ---
    function logout() {
        if(confirm('Are you sure you want to logout?')) {
            userData.email = '';
            clearInterval(timerInterval);
            navigate('screen-welcome');
            app.classList.add('hero-mode');
            // Reset timer
            timerSeconds = 120; // 2 minutes
            timerRunning = false;
            timerPhase = 'workout';
            currentSet = 1;
            updateTimerDisplay();
        }
    }

