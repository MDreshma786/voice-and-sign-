/**
 * AccessAI NextGen - Voice Assistant Engine (voice.js)
 * Implements Voice Recognition navigation and Text-To-Speech guidance
 */

class AccessAIVoice {
    constructor(onCommandExecuted, onStatusChange, onTranscription) {
        this.onCommandExecuted = onCommandExecuted;
        this.onStatusChange = onStatusChange;
        this.onTranscription = onTranscription;
        
        this.recognition = null;
        this.isListening = false;
        this.voiceGuidanceActive = false;
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.preferredVoice = null;
        
        // Cache variable for "Repeat Last Message"
        this.lastSpokenText = "No previous messages recorded.";
        
        // SpeechSynthesis default rates
        this.rate = 1.0;
        this.pitch = 1.0;

        // Initialize Speech Recognition compatibility
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            // Set up event listeners
            this.recognition.onstart = () => this.handleStart();
            this.recognition.onresult = (e) => this.handleResult(e);
            this.recognition.onerror = (e) => this.handleError(e);
            this.recognition.onend = () => this.handleEnd();
        } else {
            console.warn("Web Speech API Recognition not supported in this browser.");
        }
        
        // Load high-quality synthetic voice
        this.initVoiceList();
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.initVoiceList();
        }
    }

    /**
     * Locate premium US English synthetic voices
     */
    initVoiceList() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        this.preferredVoice = voices.find(voice => 
            voice.lang.includes('en-US') && 
            (voice.name.includes('Google') || voice.name.includes('Natural') || voice.name.includes('Microsoft'))
        ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    }

    /**
     * Configure Synthesis properties (Speed Rate, Pitch, and Voice selection)
     */
    configureVoice(voiceName, rate, pitch) {
        if (!this.synth) return;
        if (voiceName) {
            const voices = this.synth.getVoices();
            this.preferredVoice = voices.find(v => v.name === voiceName) || this.preferredVoice;
        }
        this.rate = parseFloat(rate) || 1.0;
        this.pitch = parseFloat(pitch) || 1.0;
    }

    startListening() {
        if (!this.recognition) {
            this.speak("Voice recognition is not supported in this browser. Please try Google Chrome.");
            this.onStatusChange('error', 'Browser unsupported');
            return;
        }
        if (this.isListening) return;

        try {
            this.recognition.start();
        } catch (error) {
            console.error("Recognition start error:", error);
        }
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;
        this.recognition.stop();
    }

    handleStart() {
        this.isListening = true;
        this.onStatusChange('active', 'Listening for commands...');
        this.speak("Speech assistant active. Ready.");
    }

    handleEnd() {
        this.isListening = false;
        this.onStatusChange('inactive', 'Disconnected');
    }

    handleError(event) {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
            this.onStatusChange('error', 'Microphone blocked');
            this.speak("Microphone permission denied. Please allow microphone access.");
        } else {
            this.onStatusChange('error', `Error: ${event.error}`);
        }
    }

    /**
     * Parse transcription and match navigation & advanced command hooks
     */
    handleResult(event) {
        const lastResultIndex = event.results.length - 1;
        const rawText = event.results[lastResultIndex][0].transcript;
        const text = rawText.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        
        console.log(`Speech recognized: "${text}"`);
        this.onTranscription(rawText);

        // Increments analytics voice counter
        if (window.onVoiceCommandReceived) {
            window.onVoiceCommandReceived();
        }

        // ==========================================
        // 1. BASIC NAVIGATION COMMANDS
        // ==========================================
        if (text.includes("open home") || text.includes("go to home") || text === "home") {
            this.executeCommand('#home', "Opening Home Page");
        } 
        else if (text.includes("open sign recognition") || text.includes("open gestures") || text.includes("open sign page") || text.includes("sign recognition")) {
            this.executeCommand('#sign-recognition', "Opening Sign Language Recognition");
        } 
        else if (text.includes("open voice assistant") || text.includes("open voice page") || text.includes("voice assistant")) {
            this.executeCommand('#voice-assistant', "Opening Voice Control Panel");
        }
        else if (text.includes("open accessibility dashboard") || text.includes("open accessibility page") || text.includes("open accessibility")) {
            this.executeCommand('#accessibility-dashboard', "Opening Accessibility Settings Dashboard");
        }
        else if (text.includes("open analytics dashboard") || text.includes("open analytics page") || text.includes("open analytics")) {
            this.executeCommand('#analytics-dashboard', "Opening Analytics Telemetry Dashboard");
        }
        else if (text.includes("open about") || text.includes("about project")) {
            this.executeCommand('#about', "Opening About Section");
        }
        else if (text.includes("open contact") || text.includes("contact page")) {
            this.executeCommand('#contact', "Opening Contact Page");
        }
        else if (text.includes("read screen") || text.includes("read page") || text.includes("read content")) {
            this.onCommandExecuted('read-screen');
        } 
        else if (text === "help" || text === "open help" || text === "what can i say") {
            this.onCommandExecuted('help');
        }
        else if (text.includes("stop listening") || text.includes("turn off microphone")) {
            this.speak("Microphone deactivated.");
            this.stopListening();
        }

        // ==========================================
        // 2. ADVANCED NEXTGEN VOICE COMMANDS
        // ==========================================
        
        // A. What is today's date?
        else if (text.includes("whats today date") || text.includes("what is todays date") || text.includes("read calendar date") || text === "date") {
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            this.speak(`Today is ${dateStr}.`);
        }
        
        // B. What is the current time?
        else if (text.includes("whats the current time") || text.includes("what is the current time") || text === "time") {
            const today = new Date();
            const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            this.speak(`The current time is ${timeStr}.`);
        }

        // C. Read notifications
        else if (text.includes("read notifications") || text.includes("check notification")) {
            this.onCommandExecuted('read-notifications');
        }

        // D. Font sizing alterations
        else if (text.includes("increase text size") || text.includes("make text larger") || text.includes("larger text")) {
            this.onCommandExecuted('increase-size');
        }
        else if (text.includes("decrease text size") || text.includes("make text smaller") || text.includes("smaller text")) {
            this.onCommandExecuted('decrease-size');
        }

        // E. Style theme alterations
        else if (text.includes("enable dark mode") || text.includes("activate dark theme")) {
            this.onCommandExecuted('set-theme-dark');
        }
        else if (text.includes("enable light mode") || text.includes("activate light theme")) {
            this.onCommandExecuted('set-theme-light');
        }

        // F. EMERGENCY COMMANDS
        else if (text.includes("emergency help") || text.includes("call for assistance") || text.includes("emergency alert")) {
            this.onCommandExecuted('emergency-alert');
        }

        // G. REPEAT LAST MESSAGE
        else if (text.includes("repeat last message") || text.includes("say that again") || text.includes("repeat description")) {
            this.speak("Repeating: " + this.lastSpokenText);
        }
        
        else {
            console.log("No command match for phrase:", text);
        }
    }

    executeCommand(targetHash, vocalFeedback) {
        this.speak(vocalFeedback);
        this.onCommandExecuted('navigate', targetHash);
    }

    /**
     * Text-To-Speech Synthesizer
     */
    speak(phrase, callback) {
        if (!this.synth) return;

        this.synth.cancel();

        // Cache last spoken message for repeat command
        if (!phrase.startsWith("Repeating:")) {
            this.lastSpokenText = phrase;
        }

        const utterance = new SpeechSynthesisUtterance(phrase);
        if (this.preferredVoice) {
            utterance.voice = this.preferredVoice;
        }
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        
        if (callback) {
            utterance.onend = () => callback();
        }

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }

    setVoiceGuidance(active) {
        this.voiceGuidanceActive = active;
        if (active) {
            this.speak("Screen narrator guidance activated.");
        } else {
            this.speak("Screen narrator deactivated.");
            this.synth.cancel();
        }
    }

    /**
     * Short-lived single utterance name capture helper for Welcome screen
     */
    captureSpokenName(onCaptured, onError) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            onError("Unsupported");
            return;
        }

        // Stop continuous listener temporarily to avoid conflicts
        const wasListening = this.isListening;
        if (wasListening) {
            this.stopListening();
        }

        const tempRec = new SpeechRecognition();
        tempRec.continuous = false;
        tempRec.interimResults = false;
        tempRec.lang = 'en-US';

        tempRec.onresult = (event) => {
            const name = event.results[0][0].transcript.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            onCaptured(name);
        };

        tempRec.onerror = (event) => {
            onError(event.error);
        };

        tempRec.onend = () => {
            // Restore continuous listener if it was running
            if (wasListening) {
                setTimeout(() => this.startListening(), 1000);
            }
        };

        try {
            tempRec.start();
        } catch (err) {
            onError(err.message);
        }
    }
}
