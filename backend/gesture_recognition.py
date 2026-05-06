import cv2
import mediapipe as mp
import numpy as np

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def recognize_gesture(image):
    """
    Takes a numpy image array (BGR format, typically from cv2),
    processes it with MediaPipe, and returns a recognized string if a gesture is matched.
    """
    # Convert BGR image to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Process the image and find hands
    results = hands.process(image_rgb)
    
    if not results.multi_hand_landmarks:
        return None
        
    for hand_landmarks in results.multi_hand_landmarks:
        # Get coordinates of key landmarks
        # Thumb tip (4) and IP (3)
        thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
        thumb_ip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_IP]
        
        # Index tip (8) and pip (6)
        index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
        index_pip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_PIP]
        
        # Middle tip (12) and pip (10)
        middle_tip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
        middle_pip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_PIP]

        # Ring tip (16) and pip (14)
        ring_tip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_TIP]
        ring_pip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_PIP]
        
        # Pinky tip (20) and pip (18)
        pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]
        pinky_pip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_PIP]
        
        # Check if fingers are open
        # We assume finger is open if tip is higher (y is smaller) than pip
        index_open = index_tip.y < index_pip.y
        middle_open = middle_tip.y < middle_pip.y
        ring_open = ring_tip.y < ring_pip.y
        pinky_open = pinky_tip.y < pinky_pip.y
        
        # Simple gestures
        # 1. Open Palm (all fingers up) -> "Stop/Wait" or "Help"
        if index_open and middle_open and ring_open and pinky_open:
            return "Stop / Help"
            
        # 2. Closed Fist (all fingers down)
        if not index_open and not middle_open and not ring_open and not pinky_open:
            # Check thumb direction for Yes/No
            # Thumbs Up -> Yes (thumb tip is above thumb ip and other fingers closed)
            if thumb_tip.y < thumb_ip.y - 0.05:
                return "Yes"
            # Thumbs Down -> No (thumb tip is below thumb ip and other fingers closed)
            elif thumb_tip.y > thumb_ip.y + 0.05:
                return "No"
            else:
                return "Fist"
                
        # 3. Only Index Finger Up -> "Wait / One"
        if index_open and not middle_open and not ring_open and not pinky_open:
            return "Wait"
            
    return None
