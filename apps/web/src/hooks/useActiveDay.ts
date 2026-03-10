import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "kora_user_activity";
const ACTIVE_ACTIONS = [
  "page_view",
  "campaign_created",
  "content_generated",
  "calendar_updated",
  "blog_published",
  "strategy_approved",
  "board_created",
  "settings_changed"
] as const;

type ActionType = (typeof ACTIVE_ACTIONS)[number];

interface ActivityRecord {
  date: string;
  actions: ActionType[];
}

interface StoredActivity {
  userId: string;
  days: ActivityRecord[];
  lastShownRating: string | null;
  hasRated: boolean;
}

function getStoredActivity(userId: string): StoredActivity {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading activity from localStorage:", e);
  }
  return {
    userId,
    days: [],
    lastShownRating: null,
    hasRated: false
  };
}

function saveActivity(activity: StoredActivity): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${activity.userId}`, JSON.stringify(activity));
  } catch (e) {
    console.error("Error saving activity to localStorage:", e);
  }
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function useActiveDay(userId: string | null) {
  const recordAction = useCallback(async (actionType: ActionType) => {
    if (!userId) return;

    const today = getTodayString();
    const activity = getStoredActivity(userId);
    
    const todayRecord = activity.days.find(d => d.date === today);
    
    if (todayRecord) {
      if (!todayRecord.actions.includes(actionType)) {
        todayRecord.actions.push(actionType);
      }
    } else {
      activity.days.push({
        date: today,
        actions: [actionType]
      });
    }
    
    activity.days = activity.days.slice(-30);
    saveActivity(activity);

    try {
      await supabase.rpc("record_user_activity", {
        p_user_id: userId,
        p_action_type: actionType
      });
    } catch (e) {
      console.error("Error recording activity to Supabase:", e);
    }
  }, [userId]);

  const getActiveDaysCount = useCallback((): number => {
    if (!userId) return 0;
    
    const activity = getStoredActivity(userId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
    
    return activity.days.filter(d => d.date >= thirtyDaysAgoStr).length;
  }, [userId]);

  const shouldShowRatingPopup = useCallback((): boolean => {
    if (!userId) return false;
    
    const activity = getStoredActivity(userId);
    if (activity.hasRated) return false;
    
    const activeDays = getActiveDaysCount();
    if (activeDays < 5) return false;
    
    if (activity.lastShownRating) {
      const lastShown = new Date(activity.lastShownRating);
      const daysSinceShown = Math.floor((Date.now() - lastShown.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceShown < 7) return false;
    }
    
    return true;
  }, [userId, getActiveDaysCount]);

  const markRatingShown = useCallback((): void => {
    if (!userId) return;
    
    const activity = getStoredActivity(userId);
    activity.lastShownRating = new Date().toISOString();
    saveActivity(activity);
  }, [userId]);

  const markAsRated = useCallback((): void => {
    if (!userId) return;
    
    const activity = getStoredActivity(userId);
    activity.hasRated = true;
    saveActivity(activity);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      recordAction("page_view");
    }
  }, [userId, recordAction]);

  return {
    recordAction,
    getActiveDaysCount,
    shouldShowRatingPopup,
    markRatingShown,
    markAsRated
  };
}
