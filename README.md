# AccessAI NextGen: Intelligent Accessibility and Inclusion Assistant

AccessAI NextGen is a premium, AI-powered web platform designed to support individuals with hearing and visual impairments. Running entirely in the client's browser for maximum privacy, it combines advanced gesture translation, name greetings, continuous speech commands, custom caretakers paging, emergency alerts, and a real-time analytics telemetry dashboard.

---

## 🌟 Expanded Core Features

### 👤 1. Personalized Welcome Assistant
When the application starts, it displays a Welcome Portal. You can enter your name manually or speak it into your microphone. The assistant recognizes the speech, stores it for the session, and greets you verbally:
> *"Hi Reshma, welcome to AccessAI. I am your accessibility assistant. How can I help you today?"*
Your profile name is remembered across page transitions and displayed on the toolbar and analytics grids.

### 🗣️ 2. Advanced Voice Recognition System
Activate the voice control microphone to speak routing commands, page modifiers, or calendar information.

| Speech Command | Action Performed |
| :--- | :--- |
| **"Open Home"** | Route to main page. |
| **"Open Sign Recognition"** | Route to camera portal. |
| **"Open Voice Assistant"** | Route to speech portal. |
| **"Open Accessibility Dashboard"** | Route to layout dashboard. |
| **"Open Analytics Dashboard"** | Route to diagnostics panel. |
| **"Read Screen"** / **"Help"** | Narrates sections or shortcuts guidelines. |
| **"What is today's date?"** | Speaks calendar date details. |
| **"What is the current time?"** | Speaks local clock hours and minutes. |
| **"Read notifications"** | Reads simulated notification status aloud. |
| **"Increase text size"** | Shifts text sizes to Extra Large. |
| **"Decrease text size"** | Returns text sizes to normal scale. |
| **"Enable dark mode"** / **"Enable light mode"** | Alters application themes. |
| **"Emergency Help"** / **"Call for Assistance"** | Instantly activates Emergency Alert Mode. |
| **"Repeat Last Message"** | Speaks the last synthesized text output again. |
| **"Stop Listening"** | Disables continuous voice capture. |

---

### 🖐️ 3. Custom Hand Gestures Dictionary
Face your webcam on the **Sign Recognition** portal and perform these hand gestures:

*   **Gesture A: Need Assistance** (Open palm, all 5 fingers extended together with thumb spread wide)  
    *Action:* Speaks *"Need Assistance"* and logs it to history.
*   **Gesture B: Call Caretaker** (Raise index, middle, and ring fingers; keep pinky and thumb folded)  
    *Action:* Synthesizes alert pings caretakers: *"Emergency Alert. Caretaker joseph has been paged immediately."*
*   **Gesture C: Emergency Alert Mode** (Hold a closed fist steady in camera frame for 2 seconds)  
    *Action:* Triggers **Emergency Mode** (continuous spoken alarms, flashing red banners, caretakers dial buttons).
*   **Gesture D: Navigate to Home Page** (Show victory/peace sign - index and middle extended in a V)  
    *Action:* Transitions current section immediately to `#home`.
*   **Gesture E: Confirm / Accept** (Thumbs Up)  
    *Action:* Speaks *"Confirmed"* and logs confirmation.
*   **Gesture F: Reject / Cancel** (Thumbs Down)  
    *Action:* Speaks *"Cancelled"* and logs cancellation.
*   **Gesture G: Hand Wave Left** (Sweep hand left rapidly)  
    *Action:* Sweeps navigation page to the previous screen.
*   **Gesture H: Hand Wave Right** (Sweep hand right rapidly)  
    *Action:* Sweeps navigation page to the next screen.
*   **Gesture I: Open Hand Held Steady** (Open hand held steady with minimal motion for 2 seconds)  
    *Action:* Automatically activates continuous Voice Assistant listener.
*   **Gesture J: Both Hands Visible** (Place both hands in webcam frame)  
    *Action:* Automatically triggers **Smart Accessibility Mode**.
*   **HELLO**: Open hand vertically, fingers spread wide.
*   **THANK YOU**: Flat hand tilted forward towards camera.

---

### ⚡ 4. Smart Accessibility Mode
Activated via **Gesture J** or voice commands, this suite optimizes layouts immediately:
*   Automatically scales text size to **Extra Large**.
*   Toggles color theme to **High Contrast** (yellow/black/white).
*   Enables voice guidance (**Narrator**) to read page updates and hovered buttons.

---

### 🚨 5. Emergency Accessibility Banner
When triggered by **Gesture C** or voice command:
*   Brings up a full-screen red warning alert with pulsating sirens.
*   Triggers repeating voice alert: *"Emergency Mode Activated. Assistance is dispatched."*
*   Displays Caretaker numbers and a call dispatch button.
*   Logs events and timestamps to the diagnostics list.

---

### 📊 6. Analytics Dashboard
Open the **Analytics** tab to view your session statistics:
*   Active User Name.
*   Total Gestures detected.
*   Total Voice commands processed.
*   Smart Accessibility activations.
*   Emergency warning counts.
*   Session duration clock (counts elapsed minutes/seconds).
*   Recent emergency timestamp log list.

---

## 🚀 Setup & Hosting Instructions

Since webcam streams and voice recognition require a secure browser context, host the folder using a local server:

1.  **Using Python**:
    ```bash
    python -m http.server 8080
    ```
    Navigate to `http://localhost:8080` in your web browser.
2.  **Using Node.js**:
    ```bash
    npx http-server -p 8080
    ```
