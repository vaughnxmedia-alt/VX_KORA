/** localStorage key shared by SubscriberPopup and SubscriptionForm */
export const SUBSCRIBER_POPUP_STORAGE_KEY = "subscriber_popup_state";

export const SUBSCRIBER_POPUP_MAX_IMPRESSIONS = 5;

export type SubscriberPopupStorageState = {
  count: number;
  subscribed: boolean;
};

export function parseSubscriberPopupState(): SubscriberPopupStorageState {
  try {
    const stored = localStorage.getItem(SUBSCRIBER_POPUP_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SubscriberPopupStorageState;
      if (typeof parsed.count === "number" && typeof parsed.subscribed === "boolean") {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { count: 0, subscribed: false };
}

export function writeSubscriberPopupState(state: SubscriberPopupStorageState) {
  try {
    localStorage.setItem(SUBSCRIBER_POPUP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** After Brief / marketing signup — never show the email capture popup again. */
export function suppressSubscriberPopupAsSignedUp() {
  writeSubscriberPopupState({
    count: SUBSCRIBER_POPUP_MAX_IMPRESSIONS,
    subscribed: true,
  });
}

const BRIEF_ACCESS_TOKEN_KEY = "theBriefAccessToken";

export function hasBriefEmailSignupMarker(): boolean {
  try {
    return Boolean(localStorage.getItem(BRIEF_ACCESS_TOKEN_KEY));
  } catch {
    return false;
  }
}
