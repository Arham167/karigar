import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure foreground notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Cache for active JS timers running count-down updates in memory
const activeCountdowns = {};
let countdownIntervalId = null;

/**
 * Initialize notifications, request permissions, and create Android channels
 */
export async function initNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[NotificationManager] Permissions not granted.');
      return false;
    }

    if (Platform.OS === 'android') {
      // Channel for standard confirmation notifications
      await Notifications.setNotificationChannelAsync('booking-confirm-channel', {
        name: 'Booking Confirmations',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#059669',
      });

      // Channel for sticky countdown reminder notifications
      await Notifications.setNotificationChannelAsync('booking-countdown-channel', {
        name: 'Booking Countdowns',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: null,
        lightColor: '#3B82F6',
        showBadge: false,
      });

      // Channel with loud alarm sound for starting bookings
      await Notifications.setNotificationChannelAsync('booking-alarm-channel', {
        name: 'Booking Alarms',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#EF4444',
        sound: 'default',
      });
    }
    console.log('[NotificationManager] Initialized successfully.');
    return true;
  } catch (error) {
    console.error('[NotificationManager] Error initializing notifications:', error);
    return false;
  }
}

/**
 * Show a local notification immediately when booking is confirmed
 */
export async function showBookingConfirmedNotification(booking) {
  try {
    let safeTimeVal = booking.requested_time || booking.requestedTime;
    if (!safeTimeVal) {
      safeTimeVal = new Date().toISOString();
    }
    
    // Ensure UTC format for parsing
    if (typeof safeTimeVal === 'string' && !safeTimeVal.endsWith('Z') && !safeTimeVal.includes('+') && safeTimeVal.split('T')[1]?.length <= 12) {
      safeTimeVal += 'Z';
    }

    let timeStr = "";
    const d = new Date(safeTimeVal);
    if (!isNaN(d.getTime())) {
      const utcMs = d.getTime();
      const pkMs = utcMs + (5 * 60 * 60 * 1000); // UTC+5
      const pkDate = new Date(pkMs);
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayName = days[pkDate.getUTCDay()];
      const monthName = months[pkDate.getUTCMonth()];
      const dateNum = pkDate.getUTCDate();
      
      let h = pkDate.getUTCHours();
      const m = pkDate.getUTCMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      
      timeStr = `${dayName}, ${monthName} ${dateNum}, ${h}:${m} ${ampm}`;
    } else {
      timeStr = "the requested time";
    }

    const service = booking.service_type || booking.serviceType || "Service Request";
    const loc = booking.location || "Specified Location";
    const price = booking.price || "negotiated price";

    await Notifications.scheduleNotificationAsync({
      identifier: `booking-confirm-${booking.id}`,
      content: {
        title: "Booking Confirmed! 🎉",
        body: `Your booking for ${service} has been confirmed at Rs. ${parseFloat(price).toLocaleString()} for ${timeStr} at ${loc}.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        android: {
          channelId: 'booking-confirm-channel',
        }
      },
      trigger: null, // immediate
    });
    console.log('[NotificationManager] Confirmed notification triggered for booking:', booking.id);
  } catch (error) {
    console.error('[NotificationManager] Error triggering confirmation notification:', error);
  }
}

/**
 * Schedule Native Background OS Alerts for:
 * 1. Exactly 1 hour before the booking time
 * 2. Exactly at the booking start time (with alarm sound)
 * This ensures notifications trigger even if the app is fully closed.
 */
export async function scheduleNativeOSReminders(booking) {
  try {
    const bookingId = booking.id;
    const requestedTime = new Date(booking.requested_time || booking.requestedTime);
    const service = booking.service_type || booking.serviceType || "Service";
    const now = new Date();

    // 1. Schedule 1 Hour Before Alert
    const oneHourBefore = new Date(requestedTime.getTime() - 60 * 60 * 1000);
    if (oneHourBefore > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `booking-reminder-1hour-${bookingId}`,
        content: {
          title: "Booking Reminder ⏳",
          body: `Reminder: Your booking for ${service} starts in 1 hour.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          android: {
            channelId: 'booking-confirm-channel',
          }
        },
        trigger: oneHourBefore,
      });
      console.log(`[NotificationManager] Scheduled 1-hour reminder at ${oneHourBefore.toISOString()}`);
    }

    // 2. Schedule Start Time Alarm Alert
    if (requestedTime > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `booking-reminder-start-${bookingId}`,
        content: {
          title: "Booking Starting Now! 🔔",
          body: `Your booking for ${service} is starting now. Please get in touch.`,
          sound: true,
          vibrate: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          android: {
            channelId: 'booking-alarm-channel',
          }
        },
        trigger: requestedTime,
      });
      console.log(`[NotificationManager] Scheduled start alarm at ${requestedTime.toISOString()}`);
    }
  } catch (error) {
    console.error(`[NotificationManager] Error scheduling background alerts for ${booking.id}:`, error);
  }
}

/**
 * Cancel all scheduled notifications and active countdowns for a booking
 */
export async function cancelBookingNotifications(bookingId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`booking-confirm-${bookingId}`);
    await Notifications.cancelScheduledNotificationAsync(`booking-reminder-1hour-${bookingId}`);
    await Notifications.cancelScheduledNotificationAsync(`booking-reminder-start-${bookingId}`);
    await Notifications.dismissNotificationAsync(`booking-countdown-${bookingId}`);
    await Notifications.dismissNotificationAsync(`booking-alarm-${bookingId}`);
    
    if (activeCountdowns[bookingId]) {
      delete activeCountdowns[bookingId];
      console.log(`[NotificationManager] Removed active countdown cache for: ${bookingId}`);
    }
  } catch (error) {
    console.error(`[NotificationManager] Error cancelling notifications for ${bookingId}:`, error);
  }
}

/**
 * Sync active bookings and manage the countdown process.
 * Should be called whenever bookings are loaded, updated, or when App starts.
 */
export async function syncBookingsAndManageReminders(bookings) {
  if (!bookings || !Array.isArray(bookings)) return;

  const acceptedBookings = bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed');
  const acceptedIds = new Set(acceptedBookings.map(b => b.id));

  // 1. Clean up countdowns and notifications for bookings that are no longer active/accepted
  for (const cachedId of Object.keys(activeCountdowns)) {
    if (!acceptedIds.has(cachedId)) {
      await cancelBookingNotifications(cachedId);
    }
  }

  // 2. Schedule and track countdowns for newly accepted bookings
  const now = new Date();
  for (const booking of acceptedBookings) {
    const bookingId = booking.id;
    const requestedTime = new Date(booking.requested_time || booking.requestedTime);

    if (requestedTime <= now) {
      // Booking is in the past, clean up any notifications
      await cancelBookingNotifications(bookingId);
      continue;
    }

    // Check if reminders are already scheduled (use AsyncStorage to persist across app relaunches)
    const isScheduledKey = `booking-sched-${bookingId}`;
    const alreadyScheduled = await AsyncStorage.getItem(isScheduledKey);

    if (!alreadyScheduled) {
      // Schedule background OS alarms
      await scheduleNativeOSReminders(booking);
      await AsyncStorage.setItem(isScheduledKey, 'true');
    }

    // Add to active JS list for real-time minutes-left countdown updates while app is active
    if (!activeCountdowns[bookingId]) {
      activeCountdowns[bookingId] = {
        id: bookingId,
        service: booking.service_type || "Service",
        requestedTime: requestedTime,
        lastUpdatedMinutes: null,
      };
      console.log(`[NotificationManager] Tracking countdown in-memory for booking: ${bookingId}`);
    }
  }

  // Start the background interval loop if it isn't running
  startCountdownLoop();
}

/**
 * Starts the timer interval which updates countdown notifications in the status bar
 */
function startCountdownLoop() {
  if (countdownIntervalId) return;

  console.log('[NotificationManager] Starting countdown loop (checks every 30 seconds)');
  countdownIntervalId = setInterval(async () => {
    const now = new Date();
    const activeIds = Object.keys(activeCountdowns);

    if (activeIds.length === 0) {
      console.log('[NotificationManager] No active countdowns. Stopping countdown loop.');
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      return;
    }

    for (const id of activeIds) {
      const item = activeCountdowns[id];
      const diffMs = item.requestedTime - now;
      const minutesLeft = Math.ceil(diffMs / 60000);

      if (minutesLeft <= 0) {
        // Countdown completed! Dismiss countdown, trigger alarm sound notification, clean up
        console.log(`[NotificationManager] Booking ${id} starting now! Triggering alarm.`);
        await Notifications.dismissNotificationAsync(`booking-countdown-${id}`);
        
        await Notifications.scheduleNotificationAsync({
          identifier: `booking-alarm-${id}`,
          content: {
            title: "Booking Starts Now! 🔔",
            body: `Your booking for ${item.service} is starting now!`,
            sound: true,
            vibrate: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            android: {
              channelId: 'booking-alarm-channel',
            }
          },
          trigger: null, // immediate
        });

        delete activeCountdowns[id];
        continue;
      }

      if (minutesLeft <= 60) {
        // Within 1-hour window: Update the ongoing countdown in the notification drawer
        if (item.lastUpdatedMinutes !== minutesLeft) {
          item.lastUpdatedMinutes = minutesLeft;
          const bodyText = `Your booking for ${item.service} starts in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`;
          
          await Notifications.scheduleNotificationAsync({
            identifier: `booking-countdown-${id}`,
            content: {
              title: "Upcoming Booking Reminder ⏳",
              body: bodyText,
              sound: false,
              sticky: true, // ongoing flag on Android
              priority: Notifications.AndroidNotificationPriority.LOW,
              android: {
                channelId: 'booking-countdown-channel',
              },
              data: { bookingId: id }
            },
            trigger: null, // update immediately
          });
          console.log(`[NotificationManager] Updated countdown notification for ${id}: ${minutesLeft} mins left`);
        }
      }
    }
  }, 30000); // Check every 30 seconds
}
