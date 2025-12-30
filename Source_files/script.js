  // Firebase configuration (FROM PROJECT SETTINGS → WEB APP)
    const firebaseConfig = {
        apiKey: "AIzaSyCzssTwnoEc8DPS8s6XW7lW3Ab9_VOFgKY",
        authDomain: "fitbuddy-ai-498dd.firebaseapp.com",
        projectId: "fitbuddy-ai-498dd",
        storageBucket: "fitbuddy-ai-498dd.appspot.com",
        messagingSenderId: "996918206824",
        appId: "1:996918206824:web:d7848d63708a136c9b36dd"
    };

    // ✅ Initialize Firebase (COMPAT)
    firebase.initializeApp(firebaseConfig);

    // ✅ Firebase services
    const auth = firebase.auth();
    const db = firebase.firestore();
    let isSigningUp = false;
    let isManualAuthFlow = false;

    /* 🔥 STEP 4: AUTO LOGIN ON REFRESH */
        auth.onAuthStateChanged(async (user) => {
            if (!user || isSigningUp || isManualAuthFlow) return;

            await user.reload();
            await user.getIdToken(true); // 🔥 REQUIRED
            if (!user.emailVerified) {
                await auth.signOut();
                navigate('screen-auth');
                return;
            }

            userData.uid = user.uid;
            userData.email = user.email;

            try {
                const snap = await db.collection("users").doc(user.uid).get();
                if (snap.exists) {
                    Object.assign(userData, snap.data());
                }
            } catch (err) {
                console.error("Auto-login failed:", err);
            }
            // Navigate based on whether the user's profile is complete
            if (isProfileComplete()) {
                navigationStack = ['screen-bmr'];
                navigate('screen-goals');
            } else {
                navigationStack = [];
                navigate('screen-name');
            }
        });

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
    let navigationStack = [];

    const userData = {
        name: 'User',
        age: 0,
        gender: '',
        height: 0,
        weight: 0,
        bmi: 0,
        goals: [],
        trainingFocus: [],
        time: '45 Min',
        health: '',
        email: '',
        workoutDays: [] // Track workout dates
    };

    // --- EXERCISE LIBRARY ---
    // Master exercise lists (categorised). 'Depth jumps' intentionally excluded from visible pool.
    const exerciseLibrary = {
        CHEST: [
            'Push-ups','Incline push-ups','Decline push-ups','Wide push-ups','Diamond push-ups','Bench press','Incline bench press','Decline bench press','Dumbbell bench press','Dumbbell flyes','Incline dumbbell flyes','Chest dips','Cable chest fly','Pec deck machine','Resistance band chest press'
        ],
        BACK: [
            'Pull-ups','Chin-ups','Lat pulldown','Seated cable row','Bent-over barbell row','Dumbbell row','T-bar row','Deadlift','Rack pulls','Straight-arm pulldown','Inverted rows','Machine row','Resistance band row','Wide-grip pulldown','Close-grip pulldown'
        ],
        SHOULDERS: [
            'Shoulder press','Dumbbell shoulder press','Arnold press','Lateral raises','Front raises','Rear delt fly','Upright row','Cable lateral raise','Barbell overhead press','Machine shoulder press','Face pulls','Resistance band raises','Pike push-ups','Handstand push-ups','Cuban press'
        ],
        BICEPS: [
            'Barbell curl','Dumbbell curl','Hammer curl','Preacher curl','Concentration curl','Cable curl','Incline dumbbell curl','Resistance band curl','Zottman curl','Chin-up (biceps focus)'
        ],
        TRICEPS: [
            'Tricep dips','Close-grip push-ups','Close-grip bench press','Skull crushers','Overhead tricep extension','Cable pushdown','Rope pushdown','Resistance band extension','Diamond dips','Kickbacks'
        ],
        LEGS: [
            'Squats','Front squats','Goblet squats','Lunges','Walking lunges','Reverse lunges','Bulgarian split squats','Leg press','Leg extensions','Hamstring curls','Romanian deadlifts','Stiff-leg deadlifts','Step-ups','Box squats','Jump squats','Wall sits','Pistol squats','Sumo squats','Hack squats','Resistance band squats'
        ],
        GLUTES: [
            'Hip thrusts','Glute bridges','Cable kickbacks','Donkey kicks','Fire hydrants','Kettlebell swings','Barbell hip thrusts','Frog pumps','Step-back lunges','Single-leg bridges'
        ],
        CALVES: [
            'Standing calf raises','Seated calf raises','Single-leg calf raises','Donkey calf raises','Jump rope'
        ],
        CORE: [
            'Plank','Side plank','Crunches','Sit-ups','Bicycle crunches','Leg raises','Hanging leg raises','Russian twists','Mountain climbers','Flutter kicks','V-ups','Toe touches','Ab wheel rollout','Dead bug','Hollow body hold'
        ],
        CARDIO: [
            'Jumping jacks','Burpees','High knees','Skipping rope','Sprinting','Cycling','Rowing machine','Treadmill running','Stair climbing','Shadow boxing','Battle ropes','Kettlebell clean','Kettlebell snatch','Bear crawl','Farmer’s walk'
        ],
        FUNCTIONAL: [
            'Stretching','Yoga sun salutations','Mobility drills','Foam rolling','Resistance band walks','Animal walks','Turkish get-up','Windmills','Cossack squats','Overhead carries','Sled push','Sled pull','Medicine ball slam','Medicine ball throw','Balance drills','Agility ladder','Jump lunges','Skater jumps','Broad jumps'
            // note: 'Depth jumps' intentionally omitted from visible pool
        ]
    };

    // Flattened pool used for random selection
    const combinedExercisePool = Object.values(exerciseLibrary).flat();
    let lastGeneratedExercises = [];

    function shuffleArray(arr) {
        const a = arr.slice();
        for(let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function getRandomExercises(count = 7) {
        const pool = combinedExercisePool.slice();
        const shuffled = shuffleArray(pool);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // Build a prioritized pool based on selected goals
    function buildPoolFromGoals(goals) {
        if(!goals || !goals.length) return combinedExercisePool.slice();
        const pool = [];
        const addCategory = (cat) => {
            if(!exerciseLibrary[cat]) return;
            exerciseLibrary[cat].forEach(e => pool.push(e));
        };

        goals.forEach(g => {
            const gg = g.toLowerCase();
            if(gg.includes('hypertrophy') || gg.includes('muscular') || gg.includes('weight gain')) {
                ['CHEST','BACK','LEGS','SHOULDERS','GLUTES','TRICEPS','BICEPS'].forEach(addCategory);
            } else if(gg.includes('strength')) {
                ['LEGS','BACK','CHEST','SHOULDERS'].forEach(addCategory);
            } else if(gg.includes('weight loss') || gg.includes('cardio') || gg.includes('endurance')) {
                ['CARDIO','CORE','FUNCTIONAL','LEGS'].forEach(addCategory);
            } else if(gg.includes('endurance')) {
                ['CARDIO','CORE','FUNCTIONAL'].forEach(addCategory);
            } else if(gg.includes('athletic')) {
                ['FUNCTIONAL','CARDIO','CORE'].forEach(addCategory);
            } else {
                // fallback: include all
                Object.keys(exerciseLibrary).forEach(addCategory);
            }
        });

        // Deduplicate while preserving order
        const dedup = [];
        pool.forEach(e => { if(!dedup.includes(e)) dedup.push(e); });

        // If pool too small, append from combined pool
        combinedExercisePool.forEach(e => { if(!dedup.includes(e)) dedup.push(e); });
        return dedup;
    }

    function isProfileComplete() {
        // Required: age, gender, height, weight, time
        if(!userData.age || !userData.gender) return false;
        if(!userData.height || !userData.weight) return false;
        if(!userData.time) return false;
        return true;
    }

    function randomizeIfReady(showImmediately = true) {
        if(!isProfileComplete()) return;
        // Build a prioritized pool based on training focus OR selected goals
        let pool = [];
        if (userData.trainingFocus && userData.trainingFocus.length) {
            userData.trainingFocus.forEach(cat => {
                const key = String(cat).toUpperCase();
                if (exerciseLibrary[key]) pool.push(...exerciseLibrary[key]);
            });
            if (pool.length === 0) pool = combinedExercisePool.slice();
        } else if (userData.goals && userData.goals.length) {
            pool = buildPoolFromGoals(userData.goals);
        } else {
            pool = combinedExercisePool.slice();
        }
        // Deduplicate merged pool
        const dedup = [];
        pool.forEach(e => { if(!dedup.includes(e)) dedup.push(e); });
        const shuffled = shuffleArray(dedup);
        const picks = shuffled.slice(0, Math.min(7, shuffled.length));
        lastGeneratedExercises = picks.map(n => ({ n, s: '', r: '' }));
        // Save a snapshot for account (optional)
        if(userData.uid) {
            db.collection("users").doc(userData.uid).update({
              lastPlan: lastGeneratedExercises.map(e => e.n)
            });
        }
        if(showImmediately) {
            renderResult();
            navigate('screen-result');
            populateMonthYearSelectors();
            renderCalendar();
        }
    }

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
        const current = document.querySelector('.screen.active');
        if (current && current.id !== screenId) {
            navigationStack.push(current.id);
        }

        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        clearScreenError();
        document.getElementById(screenId).classList.add('active');
        
        // Toggle Hero Mode CSS
        if(screenId === 'screen-welcome') {
            app.classList.add('hero-mode');
        } else {
            app.classList.remove('hero-mode');
        }

        // 🔥 FIX: Initialize calendar when result screen is shown
        if (screenId === 'screen-result') {
            setTimeout(() => {
                populateMonthYearSelectors();
                renderCalendar();
            }, 50);
        }
        // Render training chips when entering health/constraints screen
        if (screenId === 'screen-health') {
            setTimeout(() => renderTrainingChips(), 50);
        }
    }

    function showScreenError(msg, inputId = null) {
        const d = document.getElementById('screen-error');
        if(d) {
            d.innerText = msg.toUpperCase();
            d.style.display = 'block';
        } else {
            alert(msg);
        }
        // Highlight the specific input with error if provided
        if(inputId) {
            const inp = document.getElementById(inputId);
            if(inp) inp.classList.add('input-error');
            // Also show error message div below input if it exists
            const errDiv = document.getElementById(inputId + '-error');
            if(errDiv) {
                errDiv.innerText = 'PLEASE FILL THE REQUIRED FIELD';
                errDiv.style.display = 'block';
            }
        }
    }

    function clearScreenError() {
        const d = document.getElementById('screen-error');
        if(d) d.style.display = 'none';
        document.querySelectorAll('input.input-error, select.input-error').forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll('[id$="-error"]').forEach(el => el.style.display = 'none');
    }

    function showEmailVerificationMessage() {
        const noticeDiv = document.getElementById('verification-notice');
        if (noticeDiv) {
            noticeDiv.style.display = 'block';
        }
    }

    function hideEmailVerificationMessage() {
        const noticeDiv = document.getElementById('verification-notice');
        if (noticeDiv) {
            noticeDiv.style.display = 'none';
        }
    }

    function goBack(fallbackScreen) {
        const prev = navigationStack.pop();
        navigate(prev || fallbackScreen || 'screen-welcome');
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
            auth.signInWithEmailAndPassword(email, pass)
                            .then(async (userCredential) => {
                                const user = userCredential.user;
                                                                isManualAuthFlow = true; // 🔥 MOVE THIS TO THE TOP

                                                                await user.reload();
                                                                await user.getIdToken(true); // 🔥 FORCE TOKEN REFRESH

                                                                if (!user.emailVerified) {
                                                                        alert("Please verify your email before logging in.");
                                                                        await auth.signOut();
                                                                        isManualAuthFlow = false;
                                                                        return;
                                                                }

                                const docRef = db.collection("users").doc(user.uid);
                                const docSnap = await docRef.get();

                                // ✅ DO NOT THROW
                                if (!docSnap.exists) {
                                    await docRef.set({
                                        email: user.email,
                                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                }

                                                                const freshSnap = await docRef.get();
                                                                if (freshSnap.exists) {
                                                                    Object.assign(userData, freshSnap.data());
                                                                }
                                                                userData.email = user.email;
                                                                userData.uid = user.uid;

                                errorDiv.style.display = 'none';
                                confirmErrorDiv.style.display = 'none';
                                                                if (!userData.name || !userData.age || !userData.height || !userData.weight) {
                                                                    navigationStack = [];
                                                                    navigate('screen-name');
                                                                    setTimeout(() => { isManualAuthFlow = false; }, 500);
                                                                } else {
                                                                    // Preserve a sensible previous screen so Back goes to BMR
                                                                    navigationStack = ['screen-bmr'];
                                                                    navigate('screen-goals');
                                                                    setTimeout(() => { isManualAuthFlow = false; }, 500);
                                                                }
              })
              .catch((error) => {
                errorDiv.innerText = error.message;
                errorDiv.style.display = 'block';
                confirmErrorDiv.style.display = 'none';
              });
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
                        isSigningUp = true;
                        auth.createUserWithEmailAndPassword(email, pass)
                            .then(async (userCredential) => {
                                const user = userCredential.user;

                                // 🔥 Ensure auth state is fully ready
                                await user.reload();

                                // ✅ FIRST: create Firestore doc
                                    await db.collection("users").doc(user.uid).set({
                                        email: user.email,
                                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                // ✅ THEN: send verification email
                                await user.sendEmailVerification();

                                // Show verification notice to user
                                showEmailVerificationMessage();

                                alert("Verification email sent. Please verify before continuing.");

                                // ✅ LAST: sign out
                                await auth.signOut();
                                isSigningUp = false;
                                isManualAuthFlow = true;
                                navigate('screen-auth');
                                setTimeout(() => { isManualAuthFlow = false; }, 500);
                            })
                            .catch((error) => {
                                isSigningUp = false;
                                errorDiv.innerText = error.message;
                                errorDiv.style.display = 'block';
                                confirmErrorDiv.style.display = 'none';
                            });
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
                db.collection("users").doc(userData.uid).update({
                    name: userData.name
                });
        document.getElementById('disp-name').innerText = userData.name;
        navigate('screen-age');
    }

    function validateNext(inputId, nextId) {
        const val = document.getElementById(inputId).value;
        if(!val) {
            showScreenError('please fill missing field', inputId);
            return;
        }

        // Special handling for age screen: save age and gender
        if(inputId === 'inp-age') {
            const ageVal = parseInt(val, 10);
            if(isNaN(ageVal) || ageVal <= 0) {
                showScreenError('please enter a valid age', 'inp-age');
                return;
            }
            userData.age = ageVal;
            const genderSel = document.getElementById('inp-gender');
            if(!genderSel.value) {
                showScreenError('please fill missing field', 'inp-gender');
                return;
            }
            if(genderSel) userData.gender = genderSel.value || '';
            // persist to Firestore if logged in
            if(userData.uid) {
                db.collection("users").doc(userData.uid).update({
                  age: userData.age,
                  gender: userData.gender || ''
                });
            }
        }

        clearScreenError();
        navigate(nextId);
    }

    function setHeightMode(mode, el) {
        isMetric = (mode === 'cm');
        document.getElementById('div-ft').style.display = isMetric ? 'none' : 'flex';
        document.getElementById('div-cm').style.display = isMetric ? 'block' : 'none';
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    }

    function saveHeight() {
        if(isMetric) {
            const cm = document.getElementById('inp-cm').value;
            if(!cm) { showScreenError('please fill missing field', 'inp-cm'); return; }
            userData.height = parseFloat(cm);
        } else {
            const ft = document.getElementById('inp-ft').value;
            const inch = document.getElementById('inp-in').value;
            if(!ft) { showScreenError('please fill missing field', 'inp-ft'); return; }
            userData.height = (parseFloat(ft) * 30.48) + (parseFloat(inch || 0) * 2.54);
        }
        // Save to Firestore
        db.collection("users").doc(userData.uid).update({
          height: userData.height
        });
        clearScreenError();
        navigate('screen-weight');
    }

    function calcBMI() {
        const w = document.getElementById('inp-weight').value;
        if(!w) { showScreenError('please fill missing field', 'inp-weight'); return; }
        userData.weight = parseFloat(w);
        
        const h_m = userData.height / 100;
        const bmi = userData.weight / (h_m * h_m);
        userData.bmi = bmi.toFixed(1);
        
        // Save to Firestore
        db.collection("users").doc(userData.uid).update({
          weight: userData.weight,
          bmi: userData.bmi
        });
        
        document.getElementById('bmi-disp').innerText = userData.bmi;
        let cat = "";
        let desc = "";
        
        if(bmi < 18.5) { cat = "UNDERWEIGHT"; desc = "Focus: Caloric Surplus & Hypertrophy"; }
        else if(bmi < 25) { cat = "OPTIMAL"; desc = "Focus: Maintenance & Performance"; }
        else { cat = "OVERWEIGHT"; desc = "Focus: High Intensity Output"; }
        
        document.getElementById('bmi-cat').innerText = cat;
        document.getElementById('bmi-desc').innerText = desc;
        clearScreenError();
        navigate('screen-bmi');
    }

    function calculateBMR() {
        // BMR = Basal Metabolic Rate using Mifflin-St Jeor formula
        // Men: (10×W) + (6.25×H) - (5×A) + 5
        // Women: (10×W) + (6.25×H) - (5×A) - 161
        // W=Weight(kg), H=Height(cm), A=Age(years)
        
        const weight = userData.weight;
        const height = userData.height;
        const age = userData.age;
        const gender = userData.gender;
        
        let bmr = 0;
        
        if(gender === 'Male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else if(gender === 'Female') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        } else {
            const maleCalc = (10 * weight) + (6.25 * height) - (5 * age) + 5;
            const femaleCalc = (10 * weight) + (6.25 * height) - (5 * age) - 161;
            bmr = (maleCalc + femaleCalc) / 2;
        }
        
        userData.bmr = Math.round(bmr);
        db.collection("users").doc(userData.uid).update({
          bmr: userData.bmr
        });
        
        document.getElementById('bmr-disp').innerText = userData.bmr;
        clearScreenError();
        navigate('screen-bmr');
    }

    function selectActivityLevel(el, activityFactor) {
        document.querySelectorAll('#screen-bmr .selection-grid .chip').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        
        const tdee = Math.round(userData.bmr * activityFactor);
        userData.tdee = tdee;
        userData.activityLevel = el.innerText;
        
        db.collection("users").doc(userData.uid).update({
          tdee: userData.tdee,
          activityLevel: userData.activityLevel
        });
        
        document.getElementById('tdee-disp').innerText = tdee + ' kcal/day';
    }

    // Chips
    function toggleChip(el) {
        el.classList.toggle('selected');
        const val = el.innerText;
        if(el.classList.contains('selected')) userData.goals.push(val);
        else userData.goals = userData.goals.filter(g => g !== val);
        // Save to Firestore
        if (userData.uid) {
            db.collection("users").doc(userData.uid).update({
              goals: userData.goals
            });
        }
        // Re-randomize exercises whenever goals change
        randomizeIfReady(false);
    }

    // Training focus multi-select (chipped UI)
    function toggleTraining(el) {
        el.classList.toggle('selected');
        const val = el.innerText;
        if (!Array.isArray(userData.trainingFocus)) userData.trainingFocus = [];
        if (el.classList.contains('selected')) {
            userData.trainingFocus.push(val);
        } else {
            userData.trainingFocus = userData.trainingFocus.filter(g => g !== val);
        }
        // Persist selection to Firestore (guarded)
        if (userData.uid) {
            db.collection('users').doc(userData.uid).update({ trainingFocus: userData.trainingFocus });
        }
        // Rebuild exercises if profile complete
        randomizeIfReady(false);
    }

    function renderTrainingChips() {
        // Ensure chips reflect userData.trainingFocus
        const sel = Array.isArray(userData.trainingFocus) ? userData.trainingFocus : [];
        const chips = document.querySelectorAll('#training-chips .chip');
        chips.forEach(c => {
            if (sel.includes(c.innerText)) c.classList.add('selected');
            else c.classList.remove('selected');
        });
    }
    
    function selectSingle(el) {
        el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        userData.time = el.innerText;
        // Save to Firestore
        if (userData.uid) {
            db.collection('users').doc(userData.uid).update({
                time: userData.time
            });
        }
        // Hide error on selection
        const timeError = document.getElementById('time-error');
        if (timeError) timeError.style.display = 'none';
    }

    function validateTimeSelection() {
        const selectedChip = document.querySelector('#screen-time .chip.selected');
        if (!selectedChip) {
            const timeError = document.getElementById('time-error');
            if (timeError) {
                timeError.innerText = 'PLEASE CHOOSE ANY REQUIRED FIELD';
                timeError.style.display = 'block';
            }
            return;
        }
        // Proceed with generation
        navigate('screen-loading');
        setTimeout(() => {
            if (isExistingLogin) isExistingLogin = false;
            generatePlan();
        }, 700);
    }

    function generateWorkoutByTime(timeStr) {
        // Parse time string to minutes
        const minutes = parseInt(String(timeStr).match(/\d+/)?.[0] || 45);
        let exerciseCount = 7;
        let setsPerExercise = 3;

        if (minutes === 15 || minutes === 30) {
            exerciseCount = 5;
            setsPerExercise = 2;
        }

        // Build pool from training focus or fall back to combined
        let pool = [];
        if (userData.trainingFocus && userData.trainingFocus.length) {
            userData.trainingFocus.forEach(cat => {
                const key = String(cat).toUpperCase();
                if (exerciseLibrary[key]) {
                    pool.push(...exerciseLibrary[key]);
                }
            });
        } else if (userData.goals && userData.goals.length) {
            pool = buildPoolFromGoals(userData.goals);
        } else {
            pool = combinedExercisePool.slice();
        }

        // Deduplicate pool
        const dedup = [];
        pool.forEach(e => { if (!dedup.includes(e)) dedup.push(e); });

        // Ensure at least 1 cardio is included
        const cardioExercises = exerciseLibrary.CARDIO || [];
        const cardioPool = cardioExercises.slice();
        const selectedCardio = cardioPool.length > 0 ? cardioPool[Math.floor(Math.random() * cardioPool.length)] : null;

        // Remove cardio from main pool to avoid duplicates
        const nonCardioPool = dedup.filter(e => !cardioExercises.includes(e));

        // Shuffle and pick exercises
        const shuffled = shuffleArray(nonCardioPool);
        const picks = shuffled.slice(0, Math.min(exerciseCount - (selectedCardio ? 1 : 0), shuffled.length));

        // Add cardio at the END
        const exercises = [];
        exercises.push(...picks);
        if (selectedCardio) exercises.push(selectedCardio);

        // Map to format with sets
        const setLabel = setsPerExercise + ' SETS';
        lastGeneratedExercises = exercises.map(n => ({ n, s: setLabel, r: '' }));

        return lastGeneratedExercises;
    }

    // Generation - call FastAPI LLM endpoint and render result
    async function generatePlan() {
        // If user profile is complete, generate local randomized plan immediately (no server call)
        if(isProfileComplete()) {
            // Save latest health info
            if(document.getElementById('inp-health')) {
                userData.health = document.getElementById('inp-health').value || userData.health || '';
            }
            if (userData.uid) {
                db.collection('users').doc(userData.uid).update({
                    health: userData.health
                });
            }
            // Use time-aware generation
            generateWorkoutByTime(userData.time);
            renderResult();
            navigate('screen-result');
            populateMonthYearSelectors();
            renderCalendar();
            return;
        }

        navigate('screen-loading');

        // Save latest health info
        if(document.getElementById('inp-health')) {
            userData.health = document.getElementById('inp-health').value || userData.health || '';
        }
                db.collection("users").doc(userData.uid).update({
                    health: userData.health
                });

        // Attempt to call FastAPI endpoint (use /api/routine)
        const endpoints = [ 'http://127.0.0.1:8000/api/routine' ];
        const timeoutMs = 60000; // increase timeout to 30s for model generation

        let planFromServer = null;

        function parseFreeTime(t) {
            if(!t) return 45;
            // Accept formats like '45 Min', '30 Min', '60 Min' or '45 Min'
            const m = String(t).match(/(\d+)\s*/);
            if(m) return parseInt(m[1], 10);
            return 45;
        }

        for(const url of endpoints) {
            try {
                // timeout via AbortController (allow longer for model inference)
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), timeoutMs);

                // Build payload matching server's UserProfile model
                const payload = {
                    height: Math.round(userData.height || 0),
                    weight: Math.round(userData.weight || 0),
                    free_time: parseFreeTime(userData.time),
                    fitness_level: userData.activityLevel || (userData.goals && userData.goals.length? userData.goals[0] : 'Intermediate'),
                    goal: (userData.goals && userData.goals.length) ? userData.goals[0] : 'General'
                };

                updateDebugPanel({ url, attempt: 'request', payload });

                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeout);

                if(!resp.ok) {
                    console.warn('AI server at', url, 'responded with', resp.status);
                    updateDebugPanel({ url, status: resp.status, ok: false, note: 'non-OK response' });
                    continue;
                }

                const data = await resp.json();
                updateDebugPanel({ url, status: resp.status, ok: true, body: data });

                // Accept server response as either structured exercises or raw text under 'routine'
                if(data && Array.isArray(data.exercises) && data.exercises.length > 0) {
                    planFromServer = data;
                    break;
                }

                if(data && typeof data.routine === 'string' && data.routine.trim()) {
                    const parsed = parseRoutineToExercises(data.routine);
                    if(parsed.length > 0) {
                        planFromServer = { exercises: parsed, raw: data.routine };
                        break;
                    }
                }

                console.warn('AI server returned invalid plan at', url);
                updateDebugPanel({ url, status: resp.status, ok: true, body: data, note: 'invalid plan structure' });
                continue;
            } catch(err) {
                console.warn('Error contacting AI server at', url, err && err.name ? err.name : err);
                const note = (err && err.name === 'AbortError') ? 'timeout' : 'error';
                updateDebugPanel({ url, error: String(err), note });
                if(note === 'timeout') {
                    // Inform the user that generation can take longer and to wait
                    showScreenError('AI generation is taking longer than expected (up to 30s). Please wait.');
                }
                // try next endpoint
                continue;
            }
        }

        if(planFromServer) {
            // merge some metadata
            if(planFromServer.name) userData.name = planFromServer.name;
            if(planFromServer.time) userData.time = planFromServer.time;
            if(planFromServer.tdee) userData.tdee = planFromServer.tdee;
            if(planFromServer.bmr) userData.bmr = planFromServer.bmr;
            renderResult(planFromServer);
        } else {
            console.error('Could not reach AI server at 127.0.0.1:8000');
            showScreenError('AI server unreachable (127.0.0.1:8000) — showing local plan');
            renderResult();
        }

        navigate('screen-result');
        populateMonthYearSelectors();
        renderCalendar();
    }

    function saveHealthAndContinue() {
        const h = document.getElementById('inp-health').value;
        userData.health = h;
        if(userData.uid) {
            db.collection("users").doc(userData.uid).update({
              health: userData.health
            });
        }
        navigate('screen-time');
    }

    function renderResult(plan = null) {
        // If backend provided a plan, use it; otherwise fallback to local generation
        if(plan && Array.isArray(plan.exercises)) {
            // Use server-provided values if present, otherwise fall back to current userData
            document.getElementById('res-name').innerText = plan.name || userData.name;
            document.getElementById('res-time').innerText = plan.time || userData.time;
            if(plan.tdee) document.getElementById('tdee-disp').innerText = plan.tdee + ' kcal/day';
            if(plan.bmr) document.getElementById('bmr-disp').innerText = plan.bmr;

            const list = document.getElementById('exercise-list');
            list.innerHTML = "";
            plan.exercises.forEach((ex, i) => {
                const metaParts = [];
                if(ex.s) metaParts.push(ex.s);
                if(ex.r) metaParts.push(ex.r);
                const meta = metaParts.join(' · ');
                list.innerHTML += `
                <div class="exercise-item">
                    <div class="ex-num">${i+1}</div>
                    <div class="ex-info" style="flex:1">
                        <h4>${ex.n}</h4>
                        <div class="ex-meta">${meta}</div>
                    </div>
                </div>`;
            });
            return;
        }

        // Local fallback plan
        document.getElementById('res-name').innerText = userData.name;
        document.getElementById('res-time').innerText = userData.time;
        
        const list = document.getElementById('exercise-list');
        list.innerHTML = "";
        // Use the last randomized exercises if available, otherwise create a new randomized set
        let exercises = [];
        if(Array.isArray(lastGeneratedExercises) && lastGeneratedExercises.length > 0) {
            exercises = lastGeneratedExercises;
        } else {
            exercises = getRandomExercises(7).map(n => ({ n, s: '', r: '' }));
            lastGeneratedExercises = exercises;
        }

        // Decide sets per exercise based on user's selected time
        const minutes = parseTimeToMinutes(userData.time);
        let setsLabel = '';
        if(minutes > 30) setsLabel = '3 SETS'; // minimum 3 sets when time > 30
        else if(minutes >= 15 && minutes <= 30) setsLabel = '2 SETS'; // add 2 sets for 15-30
        else setsLabel = '1 SET';

        // Always show a Dynamic Warmup at position 1 and then the 7 randomized sequence
        const displayList = [{ n: 'Dynamic Warmup', s: '1 SET', r: '5 MIN' }].concat(
            exercises.slice(0, 7).map(ex => ({ n: ex.n, s: ex.s || setsLabel, r: ex.r || '' }))
        );

        displayList.forEach((ex, i) => {
            list.innerHTML += `
            <div class="exercise-item">
                <div class="ex-num">${i+1}</div>
                <div class="ex-info" style="flex:1">
                    <h4>${ex.n}</h4>
                    <div class="ex-meta">${ex.s} ${ex.r ? '&middot; ' + ex.r : ''}</div>
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
        document.getElementById('timer-finish').style.display = 'inline-block';
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
            document.getElementById('timer-finish').style.display = 'inline-block';
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
            document.getElementById('timer-finish').style.display = 'inline-block';
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
            document.getElementById('timer-finish').style.display = 'inline-block';
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
        // Save to Firestore
        db.collection("users").doc(userData.uid).update({
          workoutDays: userData.workoutDays
        });
    }

    // Parse raw routine text (from the model) into exercise objects
    function parseRoutineToExercises(text) {
        const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const items = [];
        for(const line of lines) {
            // consider bullet lines starting with '-' or numbered lists
            let content = line.replace(/^[-\d\.\)\s]+/, '').trim();
            if(!content) continue;

            // If line contains 'Answer:' or headings, skip
            if(/^answer[:\s]/i.test(content) || /^workout routine[:\s]/i.test(content)) continue;

            // Skip model echo of the prompt (e.g. "Height: 168 cm, Weight: 65 kg, ...")
            const lc = content.toLowerCase();
            if(lc.includes('height') && lc.includes('weight') && lc.includes('free time')) continue;

            // split into name and detail by first ':'
            let name = content;
            let detail = '';
            const m = content.match(/^([^:]+):\s*(.*)$/);
            if(m) { name = m[1].trim(); detail = m[2].trim(); }

            // try extract time/reps info from detail
            let timeMatch = detail.match(/(\d+\s*(?:min|mins|minutes|sec|secs|seconds|reps|rep))/i);
            let r = timeMatch ? timeMatch[0] : '';
            let s = detail.replace(timeMatch ? timeMatch[0] : '', '').trim();

            // if no colon-based split, and content is short, keep as name
            if(!m && content.length > 60) {
                // long line: split on '-' or '–' if present
                const parts = content.split(/[-–—]/).map(p => p.trim()).filter(Boolean);
                if(parts.length > 1) { name = parts[0]; s = parts.slice(1).join(' · '); }
            }

            items.push({ n: name, s: s || '', r: r || '' });
        }
        return items;
    }

    // Convert time label like '45 Min' to integer minutes
    function parseTimeToMinutes(t) {
        if(!t) return 45;
        const m = String(t).match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 45;
    }

    // --- DEBUG PANEL ---
    const debugAttempts = [];
    function updateDebugPanel(obj) {
        debugAttempts.push(Object.assign({ ts: new Date().toISOString() }, obj));
        const pre = document.getElementById('debug-pre');
        if(!pre) return;
        try {
            pre.innerText = debugAttempts.map((a,i) => `#${i+1} ${a.ts}\n${JSON.stringify(a, null, 2)}`).join('\n\n');
        } catch(e) {
            pre.innerText = String(debugAttempts);
        }
    }

    function toggleDebug() {
        const p = document.getElementById('debug-panel');
        if(!p) return;
        const btn = document.querySelector('button[onclick="toggleDebug()"]');
        if(p.style.display === 'none' || p.style.display === '') {
            p.style.display = 'block';
            if(btn) btn.innerText = 'Hide Debug';
        } else {
            p.style.display = 'none';
            if(btn) btn.innerText = 'Show Debug';
        }
    }

    // --- LOGOUT ---
    function logout() {
        if(confirm('Are you sure you want to logout?')) {
            auth.signOut().then(() => {
                Object.assign(userData, {
                  name: 'User',
                  age: 0,
                  gender: '',
                  height: 0,
                  weight: 0,
                  bmi: 0,
                  goals: [],
                  time: '',
                  health: '',
                  email: '',
                  workoutDays: []
                });
                clearInterval(timerInterval);
                navigate('screen-welcome');
                app.classList.add('hero-mode');
            });
        }
    }

    // --- WORKOUT COMPLETION ---
    function endWorkout() {
        clearInterval(timerInterval);
        timerRunning = false;
        
        // Calculate total calories burned
        // Formula: (BMR / 1440) * Total Time(minutes) * Intensity Factor
        // Intensity Factor: HIGH = 1.8
        const bmr = userData.bmr || 1500; // Default BMR if not calculated
        const caloriesPerMinute = (bmr / 1440) * 1.8; // High intensity
        const totalMinutes = currentSet * 2.75; // 2 min workout + 0.75 min rest per set (45 sec = 0.75 min)
        const caloriesBurned = Math.round(caloriesPerMinute * totalMinutes);
        
        // Display modal with results
        document.getElementById('modal-calories').innerText = caloriesBurned;
        document.getElementById('workout-complete-modal').style.display = 'flex';
    }

    function closeWorkoutModal() {
        document.getElementById('workout-complete-modal').style.display = 'none';
        // Reset timer for next workout
        timerSeconds = 120;
        timerPhase = 'workout';
        currentSet = 1;
        updateTimerDisplay();
        document.getElementById('timer-start').style.display = 'inline-block';
        document.getElementById('timer-pause').style.display = 'none';
        document.getElementById('timer-resume').style.display = 'none';
        document.getElementById('timer-end').style.display = 'none';
        document.getElementById('timer-finish').style.display = 'none';
        document.getElementById('timer-phase').innerText = 'WORKOUT SET 1';
    }

    // Attach input listeners so any change in profile triggers re-randomization
    (function attachAutoRandomizeListeners(){
        const fields = ['inp-age','inp-gender','inp-ft','inp-in','inp-cm','inp-weight'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if(!el) return;
            el.addEventListener('input', () => {
                // update userData from inputs
                if(id === 'inp-age') userData.age = parseInt(el.value || 0, 10);
                if(id === 'inp-gender') userData.gender = el.value || '';
                if(id === 'inp-ft' || id === 'inp-in' || id === 'inp-cm') {
                    // If metric field present, compute height when possible
                    if(document.getElementById('div-cm').style.display !== 'none') {
                        const cm = parseFloat((document.getElementById('inp-cm') || {}).value || 0);
                        if(cm) userData.height = cm;
                    } else {
                        const ft = parseFloat((document.getElementById('inp-ft') || {}).value || 0);
                        const inch = parseFloat((document.getElementById('inp-in') || {}).value || 0);
                        if(ft) userData.height = (ft * 30.48) + ( (inch || 0) * 2.54 );
                    }
                }
                if(id === 'inp-weight') userData.weight = parseFloat(el.value || 0);
                randomizeIfReady(false);
            });
            el.addEventListener('change', () => randomizeIfReady(false));
        });
    })();
