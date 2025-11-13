# DevTools Device Emulation Persistence

## ❌ Short Answer: No, DevTools settings don't persist

When you **close DevTools**, the device emulation settings **reset to default**. They don't persist between sessions.

## 🔄 What Happens

### When DevTools is Open
- ✅ Device emulation is active
- ✅ Viewport matches selected device
- ✅ Touch simulation works
- ✅ User agent is changed

### When DevTools is Closed
- ❌ Device emulation **turns off**
- ❌ Viewport returns to actual window size
- ❌ Touch simulation disabled
- ❌ User agent returns to normal

### When DevTools Reopens
- 🔄 Device emulation **resets to default**
- 🔄 You need to **manually select device again**

## ✅ Solutions

### Option 1: Keep DevTools Open (Recommended)
- **Best for**: Active development/testing
- **How**: Just keep DevTools open while testing
- **Pros**: Full device simulation, all features work
- **Cons**: Takes up screen space

### Option 2: Use Browser Profiles
- **Best for**: Different device testing setups
- **How**: Create separate browser profiles for different devices
- **Pros**: Can save device presets per profile
- **Cons**: Need to switch profiles

### Option 3: Use Our Phone Frame (Current Solution)
- **Best for**: Quick desktop testing without DevTools
- **How**: Our phone frame automatically shows for Runner/Customer apps
- **Pros**: Always visible, no DevTools needed
- **Cons**: Not as accurate as real device emulation

## 🎯 Recommended Workflow

### For Accurate Testing
1. **Open DevTools**: `F12`
2. **Toggle Device Mode**: `Cmd+Shift+M` / `Ctrl+Shift+M`
3. **Select Device**: Choose your target device
4. **Keep DevTools Open**: While testing
5. **Close DevTools**: When done (settings reset)

### For Quick Desktop Testing
1. **Just open the app**: No DevTools needed
2. **Phone frame appears automatically**: For Runner/Customer apps
3. **Test normally**: Click, scroll, interact
4. **See mobile view**: Within phone frame

## 📱 Our Phone Frame vs DevTools

### Our Phone Frame (Desktop Testing)
- ✅ Always visible (no DevTools needed)
- ✅ Persists across page refreshes
- ✅ Shows exact mobile width (428px)
- ✅ Quick visual reference
- ❌ Not as accurate as DevTools
- ❌ No touch simulation
- ❌ No network throttling

### DevTools Device Emulation
- ✅ Most accurate device simulation
- ✅ Touch event simulation
- ✅ Network throttling
- ✅ Device-specific features
- ❌ Doesn't persist when closed
- ❌ Need to reopen and reselect

## 💡 Pro Tip

**Use both**:
- **Phone frame**: For quick desktop testing and visual reference
- **DevTools**: For accurate device testing and QA

The phone frame gives you a quick mobile view without DevTools, while DevTools gives you professional device simulation when you need it.









