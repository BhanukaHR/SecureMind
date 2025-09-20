// web/src/hooks/useIdleLogout.js
import { useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function useIdleLogout(minutes = 30) {
  const timer = useRef(null);
  const warningTimer = useRef(null);
  const showWarning = useRef(false);

  
  const createWarningModal = useCallback(() => {
    if (document.getElementById('idle-warning-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'idle-warning-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(5px);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #ffffff;
      border-radius: 12px;
      padding: 2rem;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    modalContent.innerHTML = `
      <div style="color: #f59e0b; font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
      <h3 style="color: #374151; margin-bottom: 1rem; font-weight: 600;">Session Timeout Warning</h3>
      <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.5;">
        You've been idle for a while. Your session will expire in <span id="countdown" style="font-weight: 600; color: #dc2626;">2:00</span> minutes unless you continue.
      </p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button id="stay-logged-in" style="
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Stay Logged In</button>
        <button id="logout-now" style="
          background: #ef4444;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Logout Now</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Countdown timer
    let countdown = 120; // 2 minutes in seconds
    const countdownElement = document.getElementById('countdown');
    const countdownInterval = setInterval(() => {
      countdown--;
      const minutes = Math.floor(countdown / 60);
      const seconds = countdown % 60;
      countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        performLogout();
      }
    }, 1000);

    // Event listeners
    document.getElementById('stay-logged-in').onclick = () => {
      clearInterval(countdownInterval);
      hideWarning();
      resetTimer();
    };

    document.getElementById('logout-now').onclick = () => {
      clearInterval(countdownInterval);
      performLogout();
    };

    return { countdownInterval };
  }, []);

  const hideWarning = useCallback(() => {
    const modal = document.getElementById('idle-warning-modal');
    if (modal) {
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
    showWarning.current = false;
  }, []);

  const performLogout = useCallback(async () => {
    try {
      hideWarning();
      await signOut(auth);
      
      // Clear any stored session data
      localStorage.removeItem('authUser');
      sessionStorage.clear();
      
      // Show logout notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10001;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span>⏰</span>
          <span><strong>Session Expired</strong><br><small>You've been logged out due to inactivity</small></span>
        </div>
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 5000);
      
      // Redirect to login page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [hideWarning]);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
      warningTimer.current = null;
    }

    // Don't set timers if user is not authenticated
    if (!auth.currentUser) return;

    const timeoutMs = minutes * 60 * 1000; // Convert minutes to milliseconds
    const warningTimeMs = timeoutMs - (2 * 60 * 1000); // Show warning 2 minutes before timeout

    // Set warning timer (show warning 2 minutes before logout)
    warningTimer.current = setTimeout(() => {
      if (auth.currentUser && !showWarning.current) {
        showWarning.current = true;
        createWarningModal();
      }
    }, warningTimeMs);

    // Set logout timer
    timer.current = setTimeout(() => {
      if (auth.currentUser) {
        performLogout();
      }
    }, timeoutMs);
  }, [minutes, createWarningModal, performLogout]);

  useEffect(() => {
    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'keydown',
      'click',
      'touchstart',
      'scroll',
      'focus',
      'blur'
    ];

    // Throttle the reset function to avoid excessive calls
    let lastResetTime = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastResetTime > 1000) { // Throttle to max once per second
        lastResetTime = now;
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Listen for auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        resetTimer(); // Start timer when user logs in
      } else {
        // Clear timers when user logs out
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        if (warningTimer.current) {
          clearTimeout(warningTimer.current);
          warningTimer.current = null;
        }
        hideWarning();
      }
    });

    // Listen for visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial timer setup if user is already authenticated
    if (auth.currentUser) {
      resetTimer();
    }

    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach((event) => {
        document.removeEventListener(event, throttledReset);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clear timers
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (warningTimer.current) {
        clearTimeout(warningTimer.current);
        warningTimer.current = null;
      }
      
      // Remove warning modal if exists
      hideWarning();
      
      // Unsubscribe from auth changes
      unsubscribeAuth();
    };
  }, [resetTimer, hideWarning]);

  // Return an object with utility functions for manual control if needed
  return {
    resetTimer,
    performLogout,
    hideWarning,
    getRemainingTime: () => {
      // This could be used to show remaining time in UI components
      if (timer.current) {
        const startTime = timer.current._idleStart || Date.now();
        const elapsedTime = Date.now() - startTime;
        const totalTime = minutes * 60 * 1000;
        return Math.max(0, totalTime - elapsedTime);
      }
      return 0;
    }
  };
}