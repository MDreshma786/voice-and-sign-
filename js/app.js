/**
 * AccessAI NextGen - Main Core Application (app.js)
 * Coordinates Welcome sequence, Router, Keyboard shortcuts, Settings, Emergency alert pipelines & Analytics telemetry.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // -------------------------------------------------------------
    // 1. STATE & TELEMETRY INITIALIZATION
    // -------------------------------------------------------------
    const state = {
        username: 'Guest',
        activeTheme: 'theme-dark',
        fontSize: 'normal',
        dyslexiaSpacing: false,
        voiceGuidance: false,
        microphoneActive: false,
        cameraStreaming: false,
        history: [],
        currentSection: '#welcome',
        startTime: null,
        sessionTimerInterval: null,
        
        // Analytics Telemetry Counters
        analytics: {
            gesturesDetected: 0,
            voiceCommandsUsed: 0,
            accessibilityToggles: 0,
            emergencyTriggers: 0,
            handPresenceFrames: 0
        },
        
        // Emergency State
        emergencyActive: false,
        emergencySirenInterval: null,
        emergencyLogs: []
    };

    let voiceEngine = null;
    let gestureEngine = null;

    // Pages sequence for horizontal swipe routing
    const pageRouteList = [
        '#home', 
        '#sign-recognition', 
        '#voice-assistant', 
        '#accessibility-dashboard', 
        '#analytics-dashboard', 
        '#about', 
        '#contact'
    ];

    // Screen reader announcer helper
    const announceToSR = (message) => {
        const announcer = document.getElementById('sr-announcer');
        if (announcer) {
            announcer.innerText = '';
            setTimeout(() => {
                announcer.innerText = message;
            }, 80);
        }
    };

    // -------------------------------------------------------------
    // 2. PERSISTED SETTINGS LOAD
    // -------------------------------------------------------------
    const loadSettings = () => {
        state.activeTheme = localStorage.getItem('accessai-theme') || 'theme-dark';
        state.fontSize = localStorage.getItem('accessai-fontsize') || 'normal';
        state.dyslexiaSpacing = localStorage.getItem('accessai-dyslexia') === 'true';
        state.voiceGuidance = localStorage.getItem('accessai-guidance') === 'true';

        // Apply visual styling attributes to body
        document.body.className = state.activeTheme;
        document.body.setAttribute('data-font-size', state.fontSize);
        
        if (state.dyslexiaSpacing) {
            document.body.classList.add('dyslexia-font');
            const dashDysSwitch = document.getElementById('dash-dyslexia-switch');
            const drawerDysSwitch = document.getElementById('dyslexia-switch');
            if (dashDysSwitch) dashDysSwitch.checked = true;
            if (drawerDysSwitch) drawerDysSwitch.checked = true;
        }

        // Synchronize Settings Buttons
        syncUIButtons();
    };

    const syncUIButtons = () => {
        // Drawer settings buttons
        document.querySelectorAll('.settings-group button').forEach(btn => btn.classList.remove('active'));
        if (state.activeTheme === 'theme-dark') document.getElementById('theme-dark-btn').classList.add('active');
        if (state.activeTheme === 'theme-light') document.getElementById('theme-light-btn').classList.add('active');
        if (state.activeTheme === 'theme-contrast') document.getElementById('theme-contrast-btn').classList.add('active');
        document.getElementById(`font-sz-${state.fontSize}`).classList.add('active');

        // Dashboard settings buttons
        document.querySelectorAll('#section-accessibility-dashboard button').forEach(btn => btn.classList.remove('active'));
        if (state.activeTheme === 'theme-dark') document.getElementById('dash-theme-dark').classList.add('active');
        if (state.activeTheme === 'theme-light') document.getElementById('dash-theme-light').classList.add('active');
        if (state.activeTheme === 'theme-contrast') document.getElementById('dash-theme-contrast').classList.add('active');
        
        const sizeBtn = document.getElementById(`dash-font-${state.fontSize}`);
        if (sizeBtn) sizeBtn.classList.add('active');
        
        const dashGuideSwitch = document.getElementById('dash-guide-switch');
        if (dashGuideSwitch) dashGuideSwitch.checked = state.voiceGuidance;
    };

    const saveSetting = (key, value) => {
        localStorage.setItem(`accessai-${key}`, value);
    };

    loadSettings();

    // -------------------------------------------------------------
    // 3. VOICE ENGINE HOOKS & CALLBACKS
    // -------------------------------------------------------------
    const onVoiceCommand = (type, target) => {
        if (type === 'navigate' && target) {
            window.location.hash = target;
        } 
        else if (type === 'read-screen') {
            readActiveScreen();
        } 
        else if (type === 'read-notifications') {
            readMockNotifications();
        }
        else if (type === 'increase-size') {
            applyFontSize('xl');
        }
        else if (type === 'decrease-size') {
            applyFontSize('normal');
        }
        else if (type === 'set-theme-dark') {
            applyTheme('theme-dark');
        }
        else if (type === 'set-theme-light') {
            applyTheme('theme-light');
        }
        else if (type === 'emergency-alert') {
            activateEmergencyMode();
        }
        else if (type === 'help') {
            speakHelpGuide();
        }
    };

    const onVoiceStatusChange = (status, msg) => {
        const micBtn = document.getElementById('mic-toggle-btn');
        const micIcon = document.getElementById('mic-btn-icon');
        const voiceAsstMicBtn = document.getElementById('voice-assistant-mic-btn');
        const voiceAsstIcon = document.getElementById('voice-assistant-icon');
        const voiceStatusTitle = document.getElementById('voice-status-title');
        const voiceStatusBadge = document.getElementById('voice-status-badge');
        const footerStatusVoice = document.getElementById('footer-status-voice');

        if (status === 'active') {
            state.microphoneActive = true;
            document.body.classList.add('voice-active');
            micBtn.classList.add('active');
            micIcon.className = "fa-solid fa-microphone text-success";
            
            if (voiceAsstMicBtn) {
                voiceAsstMicBtn.parentElement.classList.add('voice-active');
                voiceAsstIcon.className = "fa-solid fa-microphone text-white";
                voiceStatusTitle.innerText = "Voice Assistant Listening...";
                voiceStatusBadge.className = "badge bg-success text-white px-2.5 py-1 text-xs";
                voiceStatusBadge.innerText = "Active";
            }
            
            footerStatusVoice.innerText = "Online";
            footerStatusVoice.className = "text-success";
            announceToSR("Microphone listener enabled.");
        } else {
            state.microphoneActive = false;
            document.body.classList.remove('voice-active');
            micBtn.classList.remove('active');
            micIcon.className = "fa-solid fa-microphone-slash text-danger";
            
            if (voiceAsstMicBtn) {
                voiceAsstMicBtn.parentElement.classList.remove('voice-active');
                voiceAsstIcon.className = "fa-solid fa-microphone-slash text-white";
                voiceStatusTitle.innerText = "Voice Control is OFF";
                voiceStatusBadge.className = "badge bg-danger text-white px-2.5 py-1 text-xs";
                voiceStatusBadge.innerText = "Offline";
            }
            
            footerStatusVoice.innerText = "Offline";
            footerStatusVoice.className = "text-danger";
            announceToSR("Microphone listener disabled.");
        }
    };

    const onVoiceTranscription = (transcript) => {
        const logList = document.getElementById('voice-log-list');
        if (logList) {
            const li = document.createElement('li');
            li.className = "border-bottom border-custom-light py-1.5 text-secondary-custom";
            li.innerHTML = `<span class="text-accent-custom fw-bold"><i class="fa-solid fa-chevron-right text-xs me-1"></i> Speak:</span> "${transcript}"`;
            logList.prepend(li);
        }
    };

    // Instantiate Speech Engine
    voiceEngine = new AccessAIVoice(onVoiceCommand, onVoiceStatusChange, onVoiceTranscription);

    // Load active voice guides
    if (state.voiceGuidance) {
        document.getElementById('voice-guidance-btn').classList.add('active');
        document.getElementById('voice-guidance-icon').className = "fa-solid fa-volume-high text-primary-custom";
        setTimeout(() => voiceEngine.setVoiceGuidance(true), 1200);
    }

    // Expose incremental voice counter for Speech class triggers
    window.onVoiceCommandReceived = () => {
        state.analytics.voiceCommandsUsed++;
        document.getElementById('analytics-voice-count').innerText = state.analytics.voiceCommandsUsed;
    };

    // -------------------------------------------------------------
    // 4. GESTURES ENGINE CALLBACKS
    // -------------------------------------------------------------
    const onGestureDetected = (gesture, confidence) => {
        const textDisplay = document.getElementById('detected-gesture-text');
        const confidenceContainer = document.getElementById('gesture-confidence-container');
        const confidenceVal = document.getElementById('gesture-confidence-val');
        const speakBtn = document.getElementById('speak-recognized-btn');

        if (gesture !== "None" && !gesture.includes("(Holding...)")) {
            textDisplay.innerText = gesture;
            confidenceVal.innerText = `${Math.round(confidence * 100)}%`;
            confidenceContainer.classList.remove('d-none');
            speakBtn.disabled = false;

            // Increment telemetry
            state.analytics.gesturesDetected++;
            document.getElementById('analytics-gesture-count').innerText = state.analytics.gesturesDetected;

            // Log details & build sentence
            appendGestureToHistory(gesture);

            // Execute gesture actions
            handleGestureAction(gesture);

            // Auto-speak gesture
            if (document.getElementById('auto-speak-switch').checked) {
                voiceEngine.speak(gesture);
            }
            announceToSR(`Hand gesture translated: ${gesture}`);
        } else if (gesture.includes("(Holding...)")) {
            // fist holding intermediate feedback
            textDisplay.innerText = gesture;
            confidenceContainer.classList.add('d-none');
        } else {
            textDisplay.innerText = "None";
            confidenceContainer.classList.add('d-none');
        }
    };

    const onGestureStatusChange = (status, msg) => {
        const cameraToggleBtn = document.getElementById('camera-toggle-btn');
        const cameraLoading = document.getElementById('camera-loading');
        const footerStatusCam = document.getElementById('footer-status-cam');

        if (status === 'running') {
            state.cameraStreaming = true;
            cameraToggleBtn.innerHTML = '<i class="fa-solid fa-video-slash me-1"></i> Stop Camera';
            cameraToggleBtn.className = "btn btn-danger";
            footerStatusCam.innerText = "Online";
            footerStatusCam.className = "text-success";
            announceToSR("Camera landmark processor active.");
        } else if (status === 'stopped') {
            state.cameraStreaming = false;
            cameraToggleBtn.innerHTML = '<i class="fa-solid fa-video me-1"></i> Start Camera';
            cameraToggleBtn.className = "btn btn-primary-custom";
            footerStatusCam.innerText = "Offline";
            footerStatusCam.className = "text-danger";
            announceToSR("Camera landmark processor disabled.");
        } else if (status === 'loading') {
            cameraLoading.classList.remove('d-none');
        }
    };

    // Instantiate Hand Tracker Engine
    gestureEngine = new AccessAIGestures(
        'webcam-feed', 
        'webcam-canvas', 
        onGestureDetected, 
        onGestureStatusChange
    );

    // Load models in background
    gestureEngine.init();

    // Telemetry frames updater
    window.onHandFrameProcessed = () => {
        state.analytics.handPresenceFrames++;
    };

    // -------------------------------------------------------------
    // 5. CUSTOM GESTURES ACTION HANDLER (FEATURE 3)
    // -------------------------------------------------------------
    const handleGestureAction = (gesture) => {
        switch (gesture) {
            case 'Navigate to Home Page': // Victory sign
                window.location.hash = '#home';
                voiceEngine.speak("victory sign detected. Navigating to home page.");
                break;
                
            case 'Emergency Alert Mode': // Closed fist held for 2s
                activateEmergencyMode();
                break;
                
            case 'Call Caretaker': // Three fingers raised
                triggerSimulatedCaretakerAlert();
                break;
                
            case 'Need Assistance': // Open palm thumb extended
                voiceEngine.speak("Assistance request triggered. How can we help?");
                announceToSR("Assistance request triggered.");
                break;
                
            case 'Confirm / Accept': // Thumbs up
                voiceEngine.speak("Confirmed.");
                break;
                
            case 'Reject / Cancel': // Thumbs down
                voiceEngine.speak("Cancelled.");
                break;
                
            case 'Hand Wave Left': // Prev page
                cyclePages(-1);
                break;
                
            case 'Hand Wave Right': // Next page
                cyclePages(1);
                break;
                
            case 'Activate Voice Assistant': // Open hand held steady 2s
                if (!state.microphoneActive) {
                    voiceEngine.startListening();
                }
                break;
                
            case 'Start Accessibility Mode': // Both hands visible
                activateSmartAccessibility();
                break;
        }
    };

    const cyclePages = (dir) => {
        const hash = window.location.hash || '#home';
        let idx = pageRouteList.indexOf(hash);
        if (idx === -1) idx = 0;
        
        let targetIdx = idx + dir;
        if (targetIdx < 0) targetIdx = pageRouteList.length - 1;
        if (targetIdx >= pageRouteList.length) targetIdx = 0;
        
        const targetHash = pageRouteList[targetIdx];
        window.location.hash = targetHash;
        voiceEngine.speak(`Swiped page to ${targetHash.replace('#','').replace('-',' ')}.`);
    };

    // -------------------------------------------------------------
    // 6. WELCOME SCREEN INTERACTION SYSTEM (FEATURE 1)
    // -------------------------------------------------------------
    const handleWelcomeSubmit = () => {
        const input = document.getElementById('welcome-name-input');
        const name = input.value.trim();
        
        if (name === '') {
            input.focus();
            voiceEngine.speak("Please enter your name or click the microphone to speak it.");
            announceToSR("Please fill in your name before continuing.");
            return;
        }

        // Set session profile
        state.username = name;
        sessionStorage.setItem('accessai-user', name);
        
        // Update username display tags
        document.getElementById('user-display-badge').innerHTML = `<i class="fa-solid fa-user me-1 text-primary-custom"></i> ${name}`;
        document.getElementById('home-username-greet').innerText = name;
        document.getElementById('analytics-username').innerText = name;
        
        // Start duration clocks
        state.startTime = Date.now();
        startSessionClock();

        // Switch layout display to normal application
        document.getElementById('section-welcome').classList.remove('active-section');
        document.getElementById('app-header').style.display = 'block';

        // Greet user vocally
        const greeting = `Hi ${name}, welcome to AccessAI. I am your accessibility assistant. How can I help you today?`;
        voiceEngine.speak(greeting);
        announceToSR(greeting);

        // Redirect to Home
        window.location.hash = '#home';
    };

    // Speech Capture for Name input
    document.getElementById('welcome-speak-btn').addEventListener('click', () => {
        const btn = document.getElementById('welcome-speak-btn');
        const icon = document.getElementById('welcome-speak-icon');
        const hint = document.getElementById('welcome-mic-hint');
        const input = document.getElementById('welcome-name-input');

        btn.classList.add('active', 'btn-danger');
        icon.className = "fa-solid fa-microphone-lines animate-pulse text-white";
        hint.innerText = "Please say your name clearly now...";
        voiceEngine.speak("Please speak your name now.");

        voiceEngine.captureSpokenName(
            (capturedName) => {
                input.value = capturedName;
                btn.classList.remove('active', 'btn-danger');
                icon.className = "fa-solid fa-microphone";
                hint.innerText = "Got it! Click continue to proceed.";
                voiceEngine.speak(`Got it. Your name is ${capturedName}. Click continue to proceed.`);
            },
            (error) => {
                btn.classList.remove('active', 'btn-danger');
                icon.className = "fa-solid fa-microphone";
                hint.innerText = "Click mic to try again.";
                voiceEngine.speak("Speech capture failed. Please type your name.");
            }
        );
    });

    document.getElementById('welcome-continue-btn').addEventListener('click', handleWelcomeSubmit);
    
    // Auto-focus name field on load if in welcome screen
    setTimeout(() => {
        const nameInput = document.getElementById('welcome-name-input');
        if (nameInput && window.location.hash === '#welcome') {
            nameInput.focus();
        }
    }, 800);

    // -------------------------------------------------------------
    // 7. ROUTER & PAGE MOUNTS
    // -------------------------------------------------------------
    const handleRoute = async () => {
        const hash = window.location.hash || '#welcome';
        state.currentSection = hash;

        // Force Welcome screen if name is not set
        const savedName = sessionStorage.getItem('accessai-user');
        if (!savedName && hash !== '#welcome') {
            window.location.hash = '#welcome';
            return;
        } else if (savedName && state.username === 'Guest') {
            // Restore session
            state.username = savedName;
            document.getElementById('user-display-badge').innerHTML = `<i class="fa-solid fa-user me-1 text-primary-custom"></i> ${savedName}`;
            document.getElementById('home-username-greet').innerText = savedName;
            document.getElementById('analytics-username').innerText = savedName;
            document.getElementById('app-header').style.display = 'block';
            state.startTime = Date.now();
            startSessionClock();
        }

        // Hide all views
        document.querySelectorAll('.app-section').forEach(sec => {
            sec.classList.remove('active-section');
        });

        // Clear navbar links highlight
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const targetId = `section-${hash.replace('#', '')}`;
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
            targetSection.classList.add('active-section');
            
            const navLink = document.getElementById(`nav-${hash.replace('#', '')}`);
            if (navLink) navLink.classList.add('active');

            window.scrollTo({ top: 0, behavior: 'smooth' });

            const cleanPageName = hash.replace('#', '').replace('-', ' ');
            announceToSR(`Navigated to ${cleanPageName} section.`);
            
            if (state.voiceGuidance && hash !== '#welcome') {
                voiceEngine.speak(`Viewing ${cleanPageName} screen.`);
            }

            // Camera lifecycle
            if (hash === '#sign-recognition') {
                setTimeout(async () => {
                    await gestureEngine.startCamera();
                }, 400);
            } else {
                if (state.cameraStreaming) {
                    await gestureEngine.stopCamera();
                }
            }
        }
    };

    window.addEventListener('hashchange', handleRoute);
    await handleRoute();

    // -------------------------------------------------------------
    // 8. TELEMETRY CLOCK TIMER
    // -------------------------------------------------------------
    const startSessionClock = () => {
        if (state.sessionTimerInterval) clearInterval(state.sessionTimerInterval);
        
        state.sessionTimerInterval = setInterval(() => {
            if (!state.startTime) return;
            const diff = Math.floor((Date.now() - state.startTime) / 1000);
            const min = Math.floor(diff / 60).toString().padStart(2, '0');
            const sec = (diff % 60).toString().padStart(2, '0');
            document.getElementById('analytics-duration-val').innerText = `${min}:${sec}`;
        }, 1000);
        
        // Load date in analytics
        const today = new Date();
        document.getElementById('analytics-session-date').innerText = `Date: ${today.toISOString().split('T')[0]}`;
    };

    // -------------------------------------------------------------
    // 9. SMART ACCESSIBILITY MODE (FEATURE 4)
    // -------------------------------------------------------------
    const activateSmartAccessibility = () => {
        state.analytics.accessibilityToggles++;
        document.getElementById('analytics-suite-toggles').innerText = state.analytics.accessibilityToggles;

        // 1. Scale font size
        applyFontSize('xl');
        
        // 2. Set Contrast theme
        applyTheme('theme-contrast');
        
        // 3. Enable Guidance
        state.voiceGuidance = true;
        saveSetting('guidance', true);
        document.getElementById('voice-guidance-btn').classList.add('active');
        document.getElementById('voice-guidance-icon').className = "fa-solid fa-volume-high text-primary-custom";
        voiceEngine.setVoiceGuidance(true);
        
        // Synchronize switches
        const dashGuideSwitch = document.getElementById('dash-guide-switch');
        if (dashGuideSwitch) dashGuideSwitch.checked = true;

        const infoText = "Smart Accessibility Suite enabled. Mode is High Contrast. Font scaling is Extra Large. Narrator guidance active.";
        voiceEngine.speak(infoText);
        announceToSR(infoText);
    };

    // -------------------------------------------------------------
    // 10. EMERGENCY PIPELINE CONTROLLERS (FEATURE 6)
    // -------------------------------------------------------------
    const activateEmergencyMode = () => {
        if (state.emergencyActive) return;
        
        state.emergencyActive = true;
        state.analytics.emergencyTriggers++;
        document.getElementById('analytics-emergency-triggers').innerText = state.analytics.emergencyTriggers;

        // Log timestamp
        const timeStamp = new Date().toLocaleTimeString();
        state.emergencyLogs.push(`Alert triggered at ${timeStamp}`);
        updateEmergencyLogsUI();

        // Display overlay
        document.getElementById('emergency-overlay').classList.remove('d-none');
        announceToSR("Emergency alert mode activated. Caretakers have been notified.");

        // Continuous siren loop (using speech synthesis warnings)
        const runSiren = () => {
            voiceEngine.speak("Emergency Mode Activated. Assistance is dispatched.");
        };
        runSiren();
        state.emergencySirenInterval = setInterval(runSiren, 4500);
    };

    const deactivateEmergencyMode = () => {
        if (!state.emergencyActive) return;
        
        state.emergencyActive = false;
        if (state.emergencySirenInterval) {
            clearInterval(state.emergencySirenInterval);
            state.emergencySirenInterval = null;
        }

        document.getElementById('emergency-overlay').classList.add('d-none');
        voiceEngine.speak("Emergency mode deactivated. Restoring normal operations.");
        announceToSR("Emergency mode deactivated.");
    };

    const updateEmergencyLogsUI = () => {
        const container = document.getElementById('analytics-emergency-log-list');
        if (container) {
            container.innerHTML = '';
            state.emergencyLogs.forEach(log => {
                const li = document.createElement('li');
                li.className = "text-danger border-bottom border-custom-light py-1 fw-bold text-xs";
                li.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-1 animate-pulse"></i> ${log}`;
                container.prepend(li);
            });
        }
    };

    const triggerSimulatedCaretakerAlert = () => {
        voiceEngine.speak("Emergency Alert. Caretaker joseph has been paged immediately.");
        announceToSR("Caretaker Joseph paged.");
        
        const timeStamp = new Date().toLocaleTimeString();
        state.emergencyLogs.push(`Caretaker alert dispatched at ${timeStamp}`);
        updateEmergencyLogsUI();
    };

    // Hook emergency clicks
    document.getElementById('emergency-close-btn').addEventListener('click', deactivateEmergencyMode);
    document.getElementById('emergency-call-caretaker-btn').addEventListener('click', () => {
        voiceEngine.speak("Dialing Caretaker Joseph.");
        announceToSR("Simulating phone call to caretaker joseph.");
    });
    document.getElementById('dash-btn-emergency').addEventListener('click', activateEmergencyMode);

    // -------------------------------------------------------------
    // 11. KEYBOARD NAVIGATION SHORTCUTS
    // -------------------------------------------------------------
    document.addEventListener('keydown', (event) => {
        if (event.altKey) {
            switch(event.key.toLowerCase()) {
                case 'h':
                    event.preventDefault();
                    window.location.hash = '#home';
                    break;
                case 's':
                    event.preventDefault();
                    window.location.hash = '#sign-recognition';
                    break;
                case 'v':
                    event.preventDefault();
                    window.location.hash = '#voice-assistant';
                    break;
                case 'a':
                    event.preventDefault();
                    window.location.hash = '#about';
                    break;
                case 'c':
                    event.preventDefault();
                    window.location.hash = '#contact';
                    break;
                case 'm':
                    event.preventDefault();
                    toggleMicrophoneListener();
                    break;
                case 'g':
                    event.preventDefault();
                    toggleVoiceGuidance();
                    break;
                case 'k':
                    event.preventDefault();
                    const drawerEl = document.getElementById('accessibilityPanel');
                    const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(drawerEl);
                    bsOffcanvas.toggle();
                    break;
            }
        }
    });

    const toggleMicrophoneListener = () => {
        if (state.microphoneActive) {
            voiceEngine.stopListening();
        } else {
            voiceEngine.startListening();
        }
    };

    const toggleVoiceGuidance = () => {
        state.voiceGuidance = !state.voiceGuidance;
        saveSetting('guidance', state.voiceGuidance);

        const btn = document.getElementById('voice-guidance-btn');
        const icon = document.getElementById('voice-guidance-icon');
        const dashSwitch = document.getElementById('dash-guide-switch');

        if (state.voiceGuidance) {
            btn.classList.add('active');
            icon.className = "fa-solid fa-volume-high text-primary-custom";
            if (dashSwitch) dashSwitch.checked = true;
            voiceEngine.setVoiceGuidance(true);
        } else {
            btn.classList.remove('active');
            icon.className = "fa-solid fa-volume-xmark";
            if (dashSwitch) dashSwitch.checked = false;
            voiceEngine.setVoiceGuidance(false);
        }
    };

    // -------------------------------------------------------------
    // 12. TEXT SCALING & STYLE MODIFIERS
    // -------------------------------------------------------------
    const applyTheme = (themeClass) => {
        document.body.className = '';
        state.activeTheme = themeClass;
        document.body.className = themeClass;
        
        if (state.dyslexiaSpacing) {
            document.body.classList.add('dyslexia-font');
        }

        saveSetting('theme', themeClass);
        syncUIButtons();

        const displayNames = { 
            'theme-dark': 'Dark Mode', 
            'theme-light': 'Light Mode', 
            'theme-contrast': 'High Contrast Mode' 
        };
        voiceEngine.speak(`${displayNames[themeClass]} activated.`);
        announceToSR(`Theme changed to ${displayNames[themeClass]}.`);
    };

    const applyFontSize = (sz) => {
        state.fontSize = sz;
        document.body.setAttribute('data-font-size', sz);
        saveSetting('fontsize', sz);
        syncUIButtons();
        
        voiceEngine.speak(`Text scale adjusted to ${sz}.`);
        announceToSR(`Text scale configured to ${sz}.`);
    };

    // -------------------------------------------------------------
    // 13. UI COMPONENT HANDLERS
    // -------------------------------------------------------------
    
    // Topbar events
    document.getElementById('mic-toggle-btn').addEventListener('click', toggleMicrophoneListener);
    document.getElementById('voice-guidance-btn').addEventListener('click', toggleVoiceGuidance);
    
    // Voice Assistant Page Centered Mic Button
    const voiceAsstMicBtn = document.getElementById('voice-assistant-mic-btn');
    if (voiceAsstMicBtn) {
        voiceAsstMicBtn.addEventListener('click', toggleMicrophoneListener);
    }

    // Camera control toggles
    document.getElementById('camera-toggle-btn').addEventListener('click', () => {
        if (state.cameraStreaming) {
            gestureEngine.stopCamera();
        } else {
            gestureEngine.startCamera();
        }
    });

    document.getElementById('retry-camera-btn').addEventListener('click', () => {
        document.getElementById('camera-error').classList.add('d-none');
        document.getElementById('camera-loading').classList.remove('d-none');
        gestureEngine.startCamera();
    });

    // Gesture repeaters
    document.getElementById('speak-recognized-btn').addEventListener('click', () => {
        const text = document.getElementById('detected-gesture-text').innerText;
        if (text !== "None") {
            voiceEngine.speak(text);
        }
    });

    document.getElementById('read-history-btn').addEventListener('click', () => {
        if (state.history.length > 0) {
            const list = state.history.map(item => item.text).join(', ');
            voiceEngine.speak("History reads: " + list);
        }
    });

    document.getElementById('clear-history-btn').addEventListener('click', () => {
        state.history = [];
        document.getElementById('gesture-history-list').innerHTML = '';
        document.getElementById('gesture-history-list').classList.add('d-none');
        document.getElementById('gesture-history-empty').classList.remove('d-none');
        document.getElementById('read-history-btn').disabled = true;
        voiceEngine.speak("Logs cleared.");
        announceToSR("Gesture logging list cleared.");
    });

    // Drawer buttons events
    document.getElementById('theme-dark-btn').addEventListener('click', () => applyTheme('theme-dark'));
    document.getElementById('theme-light-btn').addEventListener('click', () => applyTheme('theme-light'));
    document.getElementById('theme-contrast-btn').addEventListener('click', () => applyTheme('theme-contrast'));
    document.getElementById('font-sz-normal').addEventListener('click', () => applyFontSize('normal'));
    document.getElementById('font-sz-large').addEventListener('click', () => applyFontSize('large'));
    document.getElementById('font-sz-xl').addEventListener('click', () => applyFontSize('xl'));

    document.getElementById('dyslexia-switch').addEventListener('change', (e) => {
        toggleDyslexia(e.target.checked);
    });

    // Dashboard Page events
    document.getElementById('dash-theme-dark').addEventListener('click', () => applyTheme('theme-dark'));
    document.getElementById('dash-theme-light').addEventListener('click', () => applyTheme('theme-light'));
    document.getElementById('dash-theme-contrast').addEventListener('click', () => applyTheme('theme-contrast'));
    document.getElementById('dash-font-normal').addEventListener('click', () => applyFontSize('normal'));
    document.getElementById('dash-font-large').addEventListener('click', () => applyFontSize('large'));
    document.getElementById('dash-font-xl').addEventListener('click', () => applyFontSize('xl'));

    const dashDysSwitch = document.getElementById('dash-dyslexia-switch');
    if (dashDysSwitch) {
        dashDysSwitch.addEventListener('change', (e) => {
            toggleDyslexia(e.target.checked);
        });
    }

    const dashGuideSwitch = document.getElementById('dash-guide-switch');
    if (dashGuideSwitch) {
        dashGuideSwitch.addEventListener('change', (e) => {
            state.voiceGuidance = e.target.checked;
            saveSetting('guidance', state.voiceGuidance);
            
            const btn = document.getElementById('voice-guidance-btn');
            const icon = document.getElementById('voice-guidance-icon');
            
            if (state.voiceGuidance) {
                btn.classList.add('active');
                icon.className = "fa-solid fa-volume-high text-primary-custom";
                voiceEngine.setVoiceGuidance(true);
            } else {
                btn.classList.remove('active');
                icon.className = "fa-solid fa-volume-xmark";
                voiceEngine.setVoiceGuidance(false);
            }
        });
    }

    document.getElementById('dash-btn-smart-access').addEventListener('click', activateSmartAccessibility);

    const toggleDyslexia = (active) => {
        state.dyslexiaSpacing = active;
        saveSetting('dyslexia', active);
        
        // Sync switches
        const sw1 = document.getElementById('dyslexia-switch');
        const sw2 = document.getElementById('dash-dyslexia-switch');
        if (sw1) sw1.checked = active;
        if (sw2) sw2.checked = active;

        if (active) {
            document.body.classList.add('dyslexia-font');
            voiceEngine.speak("Dyslexia spacing active.");
            announceToSR("Dyslexia font spacing enabled.");
        } else {
            document.body.classList.remove('dyslexia-font');
            voiceEngine.speak("Dyslexia spacing disabled.");
            announceToSR("Dyslexia font spacing disabled.");
        }
    };

    // -------------------------------------------------------------
    // 14. DYNAMIC SYNTHESIZER PREFERENCES (FEATURE 4)
    // -------------------------------------------------------------
    const rateRange = document.getElementById('speech-rate-range');
    const rateDisplay = document.getElementById('rate-display-val');
    const pitchRange = document.getElementById('speech-pitch-range');
    const pitchDisplay = document.getElementById('pitch-display-val');
    const voiceSelect = document.getElementById('speech-voice-select');

    const loadVoicesToSelect = () => {
        if (!window.speechSynthesis || !voiceSelect) return;
        
        const voices = window.speechSynthesis.getVoices();
        voiceSelect.innerHTML = '';
        
        voices.forEach(voice => {
            const opt = document.createElement('option');
            opt.value = voice.name;
            opt.innerText = `${voice.name} (${voice.lang})`;
            if (voiceEngine.preferredVoice && voice.name === voiceEngine.preferredVoice.name) {
                opt.selected = true;
            }
            voiceSelect.appendChild(opt);
        });
    };

    loadVoicesToSelect();
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoicesToSelect;
    }

    const updateVoiceSettings = () => {
        const voiceVal = voiceSelect ? voiceSelect.value : null;
        const rateVal = rateRange ? rateRange.value : 1.0;
        const pitchVal = pitchRange ? pitchRange.value : 1.0;
        
        if (rateDisplay) rateDisplay.innerText = `${rateVal}x`;
        if (pitchDisplay) pitchDisplay.innerText = pitchVal;

        voiceEngine.configureVoice(voiceVal, rateVal, pitchVal);
    };

    if (rateRange) rateRange.addEventListener('input', updateVoiceSettings);
    if (pitchRange) pitchRange.addEventListener('input', updateVoiceSettings);
    if (voiceSelect) voiceSelect.addEventListener('change', updateVoiceSettings);

    document.getElementById('btn-test-speech').addEventListener('click', () => {
        updateVoiceSettings();
        voiceEngine.speak("Testing assistant voice synthesizer. Setup complete.");
    });

    // -------------------------------------------------------------
    // 15. GESTURE LOG WRITER
    // -------------------------------------------------------------
    const appendGestureToHistory = (gesture) => {
        state.history.push({
            text: gesture,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });

        const emptyMsg = document.getElementById('gesture-history-empty');
        if (emptyMsg) emptyMsg.classList.add('d-none');

        const listEl = document.getElementById('gesture-history-list');
        if (listEl) {
            listEl.classList.remove('d-none');
            const li = document.createElement('li');
            li.className = "gesture-history-item";
            li.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span class="fw-bold">${gesture}</span>
                    <span class="text-xs text-secondary-custom">${state.history[state.history.length - 1].time}</span>
                </div>
            `;
            listEl.appendChild(li);
            listEl.parentElement.scrollTop = listEl.parentElement.scrollHeight;
        }

        const readHistBtn = document.getElementById('read-history-btn');
        if (readHistBtn) readHistBtn.disabled = false;
    };

    // -------------------------------------------------------------
    // 16. READ CONTEXT HELPERS
    // -------------------------------------------------------------
    const readActiveScreen = () => {
        const hash = state.currentSection;
        let text = "";

        if (hash === '#home') {
            text = `Hi ${state.username}. Welcome to Access A I. The menu contains Home, Gestures, Voice Assistant, Accessibility, Analytics, About, and Contact sections. Use Alt keys to shift focus.`;
        } 
        else if (hash === '#sign-recognition') {
            text = "Gestures Recognition screen. Click start camera to evaluate hand positions. Use Victory sign to navigate to Home Page, or hold a fist for emergency mode.";
        } 
        else if (hash === '#voice-assistant') {
            text = "Speech Assistant control hub. Turn on microphone listener to command actions. Say emergency help to trigger sirens.";
        }
        else if (hash === '#accessibility-dashboard') {
            text = "Accessibility configs panel. Alter font sizes, color contrasts, select voice profiles, and configure speeds.";
        }
        else if (hash === '#analytics-dashboard') {
            text = "Usage statistics panel. Displays active session timers, gesture totals, matched commands, and emergency event history.";
        }
        else if (hash === '#about') {
            text = "About section. Project built using MediaPipe hands framework, TensorFlow coordinates matrices, and speech synthesizers.";
        }
        else if (hash === '#contact') {
            text = "Accessibility contact panel. Fill the message card to report layout feedback.";
        }

        voiceEngine.speak(text);
    };

    const readMockNotifications = () => {
        const today = new Date();
        const str = `You have 3 system alerts. First, camera is running. Second, voice control is active. Third, analytics system is tracking your session.`;
        voiceEngine.speak(str);
        announceToSR("Read notifications command completed.");
    };

    const speakHelpGuide = () => {
        const text = "Press Alt plus H for Home, Alt plus S for Gestures, Alt plus V for Voice, Alt plus K for accessibility settings drawer, Alt plus M to toggle microphone, and Alt plus G to toggle voice guides. Talk into mic to command navigations.";
        voiceEngine.speak(text);
    };

    // Feedback forms simulator
    const form = document.getElementById('contact-feedback-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (form.checkValidity() === false) {
                e.stopPropagation();
                form.classList.add('was-validated');
                voiceEngine.speak("Please complete all required feedback fields.");
            } else {
                form.classList.remove('was-validated');
                const successAlert = document.getElementById('form-success-alert');
                if (successAlert) {
                    successAlert.classList.remove('d-none');
                    setTimeout(() => successAlert.classList.add('d-none'), 5000);
                }
                form.reset();
                voiceEngine.speak("Feedback message logged successfully.");
                announceToSR("Feedback form submitted successfully.");
            }
        });
    }

    // Set narration on hover
    document.querySelectorAll('.navbar-nav .nav-link, .accessibility-toolbar button, .accessibility-drawer button, .accordion-button, .btn-primary-custom, .btn-secondary-custom').forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (state.voiceGuidance && !speechSynthesis.speaking) {
                const label = el.getAttribute('aria-label') || el.innerText || el.getAttribute('title');
                if (label) {
                    voiceEngine.speak(label);
                }
            }
        });
    });
});
