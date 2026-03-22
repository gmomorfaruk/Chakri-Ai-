# AI Voice Conversation - Quick Reference

## 🎤 User Experience (Simplified)

### **What Users See**

1. **Before Starting**: AI orb breathing gently (idle)
   - "Ready to start" message
   - Large "Start Interview" button

2. **During Interview**: Real-time visual feedback
   - **Blue orb** = AI speaking (waveform animation)
   - **Green orb** = Your turn to speak (listen for indicator)
   - **Purple orb** = AI thinking (processing)
   - **Slate orb** = Waiting (breathing)

3. **In Chat**: Conversation bubbles
   - You (right side, blue)
   - AI (left side, slate)
   - Live updates as you speak

4. **Feedback Panel**: Live metrics
   - Filler words counter (red/yellow/green badge)
   - Confidence meter (animated bar)

### **How to Use**

```
STEP 1: Click "Start Interview"
   ↓
STEP 2: Listen to AI's opening question
   ↓
STEP 3: When prompted, speak your answer
   ↓
STEP 4: AI listens, thinks, and responds
   ↓
STEP 5: Repeat Steps 3-4 (auto-looping)
   ↓
STEP 6: Click "End Session" to finish
```

## 🔧 Developer Reference

### **Main Component**
```typescript
<AIVoiceConversation mode="hr" | "technical" | "behavioral" />
```

### **State Management**
```typescript
// Conversation state
const [state, setState] = useState<
  "idle" | "listening" | "thinking" | "speaking" | "your_turn"
>()

// Messages
const [messages, setMessages] = useState<VoiceMessage[]>([])
const [liveTranscript, setLiveTranscript] = useState("")

// Metrics
const [fillerCount, setFillerCount] = useState(0)
const [confidence, setConfidence] = useState(100)
```

### **Key Functions**

| Function | Purpose |
|----------|---------|
| `initRecognition()` | Initialize SpeechRecognition API |
| `handleUserSpeechEnd()` | Process user speech, call API, get response |
| `speakText()` | Convert text to speech via SpeechSynthesis |
| `startListening()` | Begin microphone input |
| `stopListening()` | End microphone input |
| `handleStartSession()` | Initiate interview with opening question |
| `handleEndSession()` | Cleanup and close session |
| `handleMicClick()` | Main button handler |

### **API Integration**
```typescript
POST /api/coach/respond
{
  mode: "hr",
  message: "User's current response",
  history: [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ]
}

Response:
{ reply: "AI's response text" }
```

## 🎨 Customization

### **Colors**
```typescript
// In VoiceOrbVisualizer.tsx
getColors() {
  listening: "rgb(34, 197, 94)"   // Green
  speaking: "rgb(59, 130, 246)"   // Blue
  thinking: "rgb(168, 85, 247)"   // Purple
  idle: "rgb(100, 116, 139)"      // Slate
}
```

### **Animation Speeds**
```typescript
// Waveform frequency
time * 5 = moderate speed
time * 6 = faster speed
time * 3 = slower speed

// Breathing
Math.sin(time * 1.5) = breathing rate
```

### **Opening Questions**
```typescript
const OPENING_QUESTIONS = {
  hr: "Tell me about yourself...",
  technical: "Can you explain your most recent project...",
  behavioral: "Describe a situation where you had to handle conflict..."
}
```

### **Filler Words List**
```typescript
const FILLER_WORDS = [
  "um", "uh", "like", "you know", "actually", "basically",
  "হ্যাঁ", "মানে", "এই", "উম" // Bengali
]
```

## 📱 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full | Best support |
| Edge | ✅ Full | Chromium-based |
| Firefox | ✅ Partial | Speech synth works better |
| Safari | ✅ Partial | 14.1+ required |
| iOS Safari | ⚠️ Limited | Speech recognition not available |
| Mobile Chrome | ✅ Partial | Mic permission required |

## 🚀 Performance Tips

1. **Reduce Background Noise**: Clear room for better recognition
2. **Use Headphones**: Prevents feedback and improves mic isolation
3. **Speak Clearly**: AI transcription works best at normal pace
4. **Practice First**: Get familiar with the flow before important interviews
5. **Check Permissions**: Allow microphone access when prompted

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| "Mic not working" | Check browser microphone permissions |
| "Can't hear AI" | Check speaker volume, browser audio settings |
| "Speech recognition errors" | Reduce background noise, speak clearly |
| "Orb not animating" | Update browser, check GPU capabilities |
| "AI response delayed" | Check internet connection, API rate limits |

## 📊 Metrics Explanation

### **Filler Words**
- Green badge (0) = Perfect! No filler words
- Yellow badge (1-3) = Good! Keep it minimal
- Red badge (4+) = Try to reduce filler words

Calculation: `count >= 0 ? count : 0`

### **Confidence Score**
- 80-100: Excellent! (Green bar)
- 60-79: Good! (Yellow bar)
- 0-59: Practice more (Red bar)

Formula: `Math.max(0, 100 - fillerCount * 6)`

## 🔐 Security & Privacy

- Local speech processing (no audio upload)
- Transcript sent to Supabase only via encrypted connection
- Session data encrypted in transit
- No persistent recording without user consent

## 📈 Analytics (If Enabled)

Track in Supabase:
- Interview duration
- Number of exchanges
- Total filler words
- Final confidence score
- Mode (HR/Technical/Behavioral)

## 🎯 Interview Mode Differences

### **HR Mode**
- Focus: Communication, background, motivation
- Difficulty: Medium
- Questions: Behavioral, motivational

### **Technical Mode**
- Focus: Problem-solving, architecture, implementation
- Difficulty: Hard
- Questions: Deep technical knowledge

### **Behavioral Mode**
- Focus: Soft skills, conflict resolution, teamwork
- Difficulty: Medium
- Questions: Situation-based scenarios

## 📝 Session Flow Diagram

```
START
  ↓
Initialize SpeechRecognition
  ↓
Speak Opening Question
  ↓
State: "your_turn" (Green orb, listening enabled)
  ↓
[LOOP]
┌─ User speaks (interim transcript shows)
│  ↓
│  User finishes
│  ↓
│  State: "thinking" (Purple orb)
│  ↓
│  API call with history → Get response
│  ↓
│  State: "speaking" (Blue orb, speaking AI response)
│  ↓
│  State: "your_turn" (Green orb, ready for next)
│  ↓ (back to loop)
└─────────────────────────┘
  ↓
[User clicks "End Session"]
  ↓
Cancel recognition & speech
  ↓
Clear messages & state
  ↓
Return to "idle"
  ↓
END
```

## 🎁 Key Features Summary

- ✅ **Automatic Flow** - No manual send buttons
- ✅ **Real-time Feedback** - Live filler word detection
- ✅ **Visual Orb** - State indicated by color & animation
- ✅ **Chat Bubbles** - Natural conversation view
- ✅ **Bilingual** - English & Bengali support
- ✅ **Confidence Meter** - Animated performance metric
- ✅ **Session Timer** - Track interview length
- ✅ **Full Context** - API remembers conversation history
- ✅ **Mobile Friendly** - Responsive design
- ✅ **Production Ready** - Zero TypeScript errors

---

**Status**: ✅ **COMPLETE & SHIPPING**
