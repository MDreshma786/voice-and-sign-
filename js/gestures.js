/**
 * AccessAI NextGen v2 - Gestures Engine (gestures.js)
 * Real-time Hand Gesture Recognition using MediaPipe Hands & TensorFlow.js
 */

class AccessAIGestures {
    constructor(videoElId, defaultCanvasId, onGestureRecognized, onStatusUpdate) {
        this.videoEl = document.getElementById(videoElId);
        this.canvasEl = document.getElementById(defaultCanvasId);
        this.ctx = this.canvasEl ? this.canvasEl.getContext('2d') : null;
        this.onGestureRecognized = onGestureRecognized;
        this.onStatusUpdate = onStatusUpdate;
        
        this.hands = null;
        this.camera = null;
        this.cameraActive = false;
        
        // Landmark tracking history
        this.landmarksHistory = [];
        this.maxHistoryLength = 20;
        
        // Temporal state tracking variables
        this.fistStartTime = null;
        this.openSteadyStartTime = null;
        this.lastWristX = null;
        
        // Cooldown filters
        this.gestureCooldown = false;
        this.lastGesture = "None";
        this.consecutiveCount = 0;
        this.requiredConsecutiveFrames = 4; // Low filter lag for quick response
        
        this.onResults = this.onResults.bind(this);
    }

    /**
     * Swap drawing context to the currently active page's canvas
     */
    updateCanvasElement(canvasId) {
        const el = document.getElementById(canvasId);
        if (el) {
            this.canvasEl = el;
            this.ctx = el.getContext('2d');
            console.log(`Gestures canvas updated to: #${canvasId}`);
        }
    }

    /**
     * Initialize MediaPipe Hands & TensorFlow.js
     */
    async init() {
        try {
            this.onStatusUpdate('loading', 'Loading Hand Gesture Models...');
            
            if (typeof tf === 'undefined') {
                throw new Error("TensorFlow.js not loaded.");
            }
            await tf.ready();

            if (typeof Hands === 'undefined') {
                throw new Error("MediaPipe Hands not loaded.");
            }

            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.65,
                minTrackingConfidence: 0.65
            });

            this.hands.onResults(this.onResults);
            this.onStatusUpdate('ready', 'Model matrices loaded successfully.');
        } catch (error) {
            console.error("Initialization error:", error);
            this.onStatusUpdate('error', `Model Load Error: ${error.message}`);
        }
    }

    /**
     * Start webcam stream
     */
    async startCamera() {
        if (this.cameraActive) return;
        
        try {
            this.onStatusUpdate('loading', 'Accessing webcam...');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 360, frameRate: { ideal: 30 } }
            });
            this.videoEl.srcObject = stream;
            
            if (typeof Camera !== 'undefined') {
                this.camera = new Camera(this.videoEl, {
                    onFrame: async () => {
                        if (this.cameraActive) {
                            await this.hands.send({ image: this.videoEl });
                        }
                    },
                    width: 640,
                    height: 360
                });
                
                await this.camera.start();
                this.cameraActive = true;
                this.onStatusUpdate('running', 'Active');
                
                const loadOverlay = document.getElementById('camera-loading');
                const errOverlay = document.getElementById('camera-error');
                if (loadOverlay) loadOverlay.classList.add('d-none');
                if (errOverlay) errOverlay.classList.add('d-none');
            } else {
                throw new Error("MediaPipe Camera helper missing.");
            }
        } catch (error) {
            console.error("Camera access failed:", error);
            this.onStatusUpdate('error', `Camera Error: ${error.message}`);
            
            const errOverlay = document.getElementById('camera-error');
            const errMsg = document.getElementById('camera-error-msg');
            if (errOverlay) errOverlay.classList.remove('d-none');
            if (errMsg) errMsg.innerText = `Camera Permission Denied: ${error.message}`;
            
            const loadOverlay = document.getElementById('camera-loading');
            if (loadOverlay) loadOverlay.classList.add('d-none');
        }
    }

    /**
     * Stop webcam stream
     */
    async stopCamera() {
        if (!this.cameraActive) return;
        
        try {
            if (this.camera) {
                await this.camera.stop();
            }
            if (this.videoEl.srcObject) {
                this.videoEl.srcObject.getTracks().forEach(track => track.stop());
                this.videoEl.srcObject = null;
            }
            this.cameraActive = false;
            this.clearCanvas();
            this.onStatusUpdate('stopped', 'Offline');
        } catch (error) {
            console.error("Camera stop failure:", error);
        }
    }

    clearCanvas() {
        if (this.ctx && this.canvasEl) {
            this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
        }
    }

    /**
     * Frame evaluation
     */
    onResults(results) {
        if (!this.cameraActive || !this.canvasEl) return;

        const width = this.canvasEl.clientWidth;
        const height = this.canvasEl.clientHeight;
        if (this.canvasEl.width !== width || this.canvasEl.height !== height) {
            this.canvasEl.width = width;
            this.canvasEl.height = height;
        }

        this.clearCanvas();
        
        // Draw video flipped (mirror style)
        this.ctx.save();
        this.ctx.translate(this.canvasEl.width, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(results.image, 0, 0, this.canvasEl.width, this.canvasEl.height);
        this.ctx.restore();

        let recognizedGesture = "None";
        let confidence = 0;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Draw skeleton overlays
            for (const landmarks of results.multiHandLandmarks) {
                this.drawHandOverlay(landmarks);
            }

            // Run TF.js math classifications
            const gestureResult = this.classifyGestures(results.multiHandLandmarks, results.multiHandedness);
            recognizedGesture = gestureResult.gesture;
            confidence = gestureResult.confidence;

            // Push history buffer for swiping waves
            this.landmarksHistory.push(JSON.parse(JSON.stringify(results.multiHandLandmarks)));
            if (this.landmarksHistory.length > this.maxHistoryLength) {
                this.landmarksHistory.shift();
            }

            // Trigger window callback for hand presence tracking
            if (window.onHandFrameProcessed) {
                window.onHandFrameProcessed();
            }
        } else {
            this.landmarksHistory = [];
            this.fistStartTime = null;
            this.openSteadyStartTime = null;
        }

        // Noise filtering
        if (recognizedGesture !== "None") {
            if (recognizedGesture === this.lastGesture) {
                this.consecutiveCount++;
                if (recognizedGesture === "Emergency Alert" || recognizedGesture === "Fist (Holding...)") {
                    this.onGestureRecognized(recognizedGesture, confidence);
                } 
                else if (this.consecutiveCount >= this.requiredConsecutiveFrames && !this.gestureCooldown) {
                    this.onGestureRecognized(recognizedGesture, confidence);
                    this.triggerCooldown();
                }
            } else {
                this.lastGesture = recognizedGesture;
                this.consecutiveCount = 1;
            }
        } else {
            this.consecutiveCount = 0;
            this.lastGesture = "None";
            this.onGestureRecognized("None", 0);
        }
    }

    triggerCooldown() {
        this.gestureCooldown = true;
        setTimeout(() => {
            this.gestureCooldown = false;
        }, 1200); // 1.2s delay
    }

    drawHandOverlay(landmarks) {
        if (typeof drawConnectors === 'undefined' || typeof drawLandmarks === 'undefined') {
            this.ctx.fillStyle = '#06b6d4';
            for (let i = 0; i < landmarks.length; i++) {
                const pt = landmarks[i];
                const x = (1 - pt.x) * this.canvasEl.width;
                const y = pt.y * this.canvasEl.height;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            return;
        }

        const flippedLandmarks = landmarks.map(pt => ({
            x: 1 - pt.x,
            y: pt.y,
            z: pt.z
        }));

        drawConnectors(this.ctx, flippedLandmarks, HAND_CONNECTIONS, {
            color: '#8b5cf6',
            lineWidth: 2.5
        });
        
        drawLandmarks(this.ctx, flippedLandmarks, {
            color: '#06b6d4',
            fillColor: '#ffffff',
            radius: 3.5,
            lineWidth: 1
        });
    }

    /**
     * Advanced hand gesture recognition rules evaluating vector separations via TensorFlow.js
     */
    classifyGestures(multiLandmarks, multiHandedness) {
        const handCount = multiLandmarks.length;

        // FEATURE 3 - GESTURE J: Both Hands Visible -> Start Accessibility Mode
        if (handCount === 2) {
            this.fistStartTime = null;
            this.openSteadyStartTime = null;
            return { gesture: "Start Accessibility Mode", confidence: 0.98 };
        }

        const primaryHand = multiLandmarks[0];
        const rawCoords = primaryHand.map(l => [l.x, l.y, l.z]);
        
        let gesture = "None";
        let confidence = 0;

        tf.tidy(() => {
            const tensor = tf.tensor2d(rawCoords);
            
            // Standard wrist & joint tips
            const wrist = tensor.slice([0, 0], [1, 3]);
            const thumbTip = tensor.slice([4, 0], [1, 3]);
            const indexTip = tensor.slice([8, 0], [1, 3]);
            const middleTip = tensor.slice([12, 0], [1, 3]);
            const ringTip = tensor.slice([16, 0], [1, 3]);
            const pinkyTip = tensor.slice([20, 0], [1, 3]);

            // Finger extension states (True if Tip y < Knuckle PIP/MCP y)
            const isIndexExtended = primaryHand[8].y < primaryHand[6].y;
            const isMiddleExtended = primaryHand[12].y < primaryHand[10].y;
            const isRingExtended = primaryHand[16].y < primaryHand[14].y;
            const isPinkyExtended = primaryHand[20].y < primaryHand[18].y;
            
            // Thumb spread outward check
            const isThumbExtended = Math.abs(primaryHand[4].x - primaryHand[5].x) > 0.08;
            
            // Closed fist state
            const isFist = !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;

            // =========================================================
            // GESTURE CLASSIFIERS MATRIX
            // =========================================================
            
            // 1. GESTURE C: Closed Fist Held for 2 Seconds (Emergency Alert)
            if (isFist && !isThumbExtended) {
                const now = Date.now();
                if (!this.fistStartTime) {
                    this.fistStartTime = now;
                } else if (now - this.fistStartTime >= 2000) {
                    gesture = "Emergency Alert";
                    confidence = 0.99;
                } else {
                    gesture = "Fist (Holding...)";
                    confidence = 0.50;
                }
                this.openSteadyStartTime = null;
            } 
            
            // 2. GESTURE E: Thumbs Up (Confirm / Accept)
            else if (isFist && primaryHand[4].y < primaryHand[3].y && primaryHand[4].y < primaryHand[5].y) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                gesture = "Confirm / Accept";
                confidence = 0.93;
            }

            // 3. GESTURE F: Thumbs Down (Reject / Cancel)
            else if (isFist && primaryHand[4].y > primaryHand[3].y && primaryHand[4].y > primaryHand[17].y) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                gesture = "Reject / Cancel";
                confidence = 0.91;
            }

            // 4. GESTURE D: Victory Sign (Navigate to Home Page)
            else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                
                const tipDistance = Math.sqrt(
                    Math.pow(primaryHand[8].x - primaryHand[12].x, 2) +
                    Math.pow(primaryHand[8].y - primaryHand[12].y, 2)
                );
                
                if (tipDistance > 0.045) {
                    gesture = "Navigate to Home Page";
                    confidence = 0.95;
                }
            }

            // 5. GESTURE B: Three Fingers Raised (Call Caretaker)
            else if (isIndexExtended && isMiddleExtended && isRingExtended && !isPinkyExtended && !isThumbExtended) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                gesture = "Call Caretaker";
                confidence = 0.94;
            }

            // 6. GESTURE K: 🤟 I Love You Sign (Send Positive Message)
            else if (isThumbExtended && isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                
                // Ensure middle and ring are folded deep
                const middleFolded = primaryHand[12].y > primaryHand[10].y;
                const ringFolded = primaryHand[16].y > primaryHand[14].y;
                
                if (middleFolded && ringFolded) {
                    gesture = "Send Positive Message";
                    confidence = 0.95;
                }
            }

            // 7. GESTURE N: 🤘 Rock Sign (Activate Smart Assistant)
            else if (!isThumbExtended && isIndexExtended && !isMiddleExtended && !isRingExtended && isPinkyExtended) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                gesture = "Activate Smart Assistant";
                confidence = 0.93;
            }

            // 8. GESTURE L: 🤞 Crossed Fingers (Save Current Activity)
            // Index and middle extended, but tips close horizontally
            else if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended && !isThumbExtended) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                
                const tipDistX = Math.abs(primaryHand[8].x - primaryHand[12].x);
                if (tipDistX < 0.03) {
                    gesture = "Save Current Activity";
                    confidence = 0.92;
                }
            }

            // 9. GESTURE M: 👌 OK Sign (Accept Settings)
            // Thumb and index touching, other fingers open
            else if (isMiddleExtended && isRingExtended && isPinkyExtended) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                
                const thumbIndexDist = Math.sqrt(
                    Math.pow(primaryHand[4].x - primaryHand[8].x, 2) +
                    Math.pow(primaryHand[4].y - primaryHand[8].y, 2)
                );
                
                if (thumbIndexDist < 0.035) {
                    gesture = "Accept Settings";
                    confidence = 0.94;
                }
            }

            // 10. GESTURE A: Open Palm + Thumb Extended (Need Assistance)
            // Fingers index, middle, ring, pinky together, thumb open wide
            else if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && isThumbExtended) {
                this.fistStartTime = null;
                
                const indexPinkySpread = Math.abs(primaryHand[8].x - primaryHand[20].x);
                if (indexPinkySpread < 0.11) {
                    gesture = "Need Assistance";
                    confidence = 0.90;
                } else {
                    // Standard spread: HELLO
                    gesture = "Hello";
                    confidence = 0.91;
                    
                    // GESTURE I: Open Hand Held Steady 2s (Activate Voice Assistant)
                    const now = Date.now();
                    if (!this.openSteadyStartTime) {
                        this.openSteadyStartTime = now;
                    } else if (now - this.openSteadyStartTime >= 2000) {
                        let steady = true;
                        if (this.landmarksHistory.length >= 10) {
                            const wristVals = this.landmarksHistory.slice(-10).map(h => h[0][0].x);
                            const variance = Math.max(...wristVals) - Math.min(...wristVals);
                            if (variance > 0.035) steady = false;
                        }
                        if (steady) {
                            gesture = "Activate Voice Assistant";
                            confidence = 0.96;
                        }
                    }
                }
            }

            // 11. THANK YOU: Flat hand tilted forward towards the camera
            else if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
                this.fistStartTime = null;
                this.openSteadyStartTime = null;
                
                const avgTipZ = (primaryHand[8].z + primaryHand[12].z + primaryHand[16].z + primaryHand[20].z) / 4;
                const wristZ = primaryHand[0].z;
                
                if (avgTipZ - wristZ < -0.06) {
                    gesture = "Thank You";
                    confidence = 0.89;
                }
            }
        });

        // 12. SWIPING GESTURES G & H: Hand Wave Left / Right
        if (gesture === "None" && this.landmarksHistory.length >= 8) {
            const currentFrame = multiLandmarks[0];
            const oldFrame = this.landmarksHistory[this.landmarksHistory.length - 8][0];

            if (currentFrame && oldFrame) {
                const dx = currentFrame[0].x - oldFrame[0].x;
                const dy = Math.abs(currentFrame[0].y - oldFrame[0].y);

                if (dy < 0.08) {
                    if (dx > 0.15) {
                        this.fistStartTime = null;
                        this.openSteadyStartTime = null;
                        gesture = "Hand Wave Left";
                        confidence = 0.86;
                    } else if (dx < -0.15) {
                        this.fistStartTime = null;
                        this.openSteadyStartTime = null;
                        gesture = "Hand Wave Right";
                        confidence = 0.86;
                    }
                }
            }
        }

        // Reset timers if state broke
        if (gesture !== "Emergency Alert" && gesture !== "Fist (Holding...)") {
            this.fistStartTime = null;
        }
        if (gesture !== "Activate Voice Assistant" && gesture !== "Hello") {
            this.openSteadyStartTime = null;
        }

        return { gesture, confidence };
    }
}
